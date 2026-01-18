import os
import re
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog


STYLE_RE = re.compile(r"(<style\b[^>]*>)(.*?)(</style>)", re.IGNORECASE | re.DOTALL)
SCRIPT_RE = re.compile(r"(<script\b[^>]*>)(.*?)(</script>)", re.IGNORECASE | re.DOTALL)
BODY_RE = re.compile(r"(<body\b[^>]*>)(.*?)(</body>)", re.IGNORECASE | re.DOTALL)
HEAD_RE = re.compile(r"(<head\b[^>]*>)(.*?)(</head>)", re.IGNORECASE | re.DOTALL)


def read_text(path: str) -> str:
    for enc in ("utf-8", "utf-8-sig", "cp1254", "latin-1"):
        try:
            with open(path, "r", encoding=enc, errors="strict") as f:
                return f.read()
        except Exception:
            pass
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write_text(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def extract_and_empty_styles(html: str):
    css_parts = []

    def _repl(m):
        css_parts.append(m.group(2))
        return f"{m.group(1)}{m.group(3)}"  # keep tags, empty inside

    new_html = STYLE_RE.sub(_repl, html)
    css = "\n\n".join([c.strip("\n") for c in css_parts if c.strip()])
    return new_html, css


def extract_and_empty_body_scripts(body_html: str):
    js_parts = []

    def _repl(m):
        inner = m.group(2)
        if inner and inner.strip():
            js_parts.append(inner)
        return f"{m.group(1)}{m.group(3)}"  # keep tags, empty inside

    new_body = SCRIPT_RE.sub(_repl, body_html)
    js_all = "\n\n".join([j.strip("\n") for j in js_parts if j.strip()])
    return new_body, js_all


def split_js_into_units(js: str):
    if not js.strip():
        return []

    lines = js.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    units = []
    cur = []

    brace_depth = 0
    in_sl_comment = False
    in_ml_comment = False
    in_str = None  # "'", '"', '`'
    esc = False

    def process_line(line: str):
        nonlocal brace_depth, in_sl_comment, in_ml_comment, in_str, esc
        i = 0
        in_sl_comment = False
        while i < len(line):
            ch = line[i]
            nxt = line[i + 1] if i + 1 < len(line) else ""

            if in_sl_comment:
                break

            if in_ml_comment:
                if ch == "*" and nxt == "/":
                    in_ml_comment = False
                    i += 2
                    continue
                i += 1
                continue

            if in_str:
                if esc:
                    esc = False
                    i += 1
                    continue
                if ch == "\\":
                    esc = True
                    i += 1
                    continue
                if ch == in_str:
                    in_str = None
                    i += 1
                    continue
                i += 1
                continue

            if ch == "/" and nxt == "/":
                in_sl_comment = True
                break
            if ch == "/" and nxt == "*":
                in_ml_comment = True
                i += 2
                continue
            if ch in ("'", '"', "`"):
                in_str = ch
                i += 1
                continue
            if ch == "{":
                brace_depth += 1
            elif ch == "}":
                brace_depth = max(0, brace_depth - 1)

            i += 1

    for line in lines:
        cur.append(line)
        process_line(line)
        s = line.strip()
        if brace_depth == 0 and (s.endswith(";") or s.endswith("}")) and cur:
            units.append("\n".join(cur).rstrip() + "\n")
            cur = []

    if cur:
        units.append("\n".join(cur).rstrip() + "\n")

    merged = []
    buf = ""
    for u in units:
        if len(u.strip()) < 30:
            buf += u
            continue
        if buf:
            merged.append(buf)
            buf = ""
        merged.append(u)
    if buf:
        merged.append(buf)

    return [u for u in merged if u.strip()]


def pack_units_into_n_files(units, n: int):
    if n <= 1:
        return ["".join(units)]

    if not units:
        return [""] * n

    total = sum(len(u) for u in units)
    target = max(1, total // n)

    files = []
    cur = ""
    for u in units:
        if len(files) < n - 1 and cur and (len(cur) + len(u) > target):
            files.append(cur.rstrip() + "\n")
            cur = ""
        cur += u
    files.append(cur.rstrip() + "\n")

    while len(files) < n:
        files.append("")
    if len(files) > n:
        tail = "".join(files[n - 1 :])
        files = files[: n - 1] + [tail]

    return files


def build_loader_script(js_filenames):
    lines = []
    lines.append("<script>")
    lines.append("const v = new Date().getTime();")
    for fn in js_filenames:
        lines.append(f"document.write('<script src=\"js/{fn}?v=' + v + '\"><\\/script>');")
    lines.append("</script>")
    return "\n".join(lines) + "\n"


def ensure_styles_link_in_head(html: str):
    link_tag = '<link rel="stylesheet" href="styles.css">'
    if re.search(r'<link\b[^>]*href=["\']styles\.css["\']', html, re.IGNORECASE):
        return html  # already there

    m = HEAD_RE.search(html)
    if m:
        head_open, head_inner, head_close = m.group(1), m.group(2), m.group(3)
        # insert before </head>
        new_head_inner = head_inner.rstrip() + "\n" + link_tag + "\n"
        new_head = head_open + new_head_inner + head_close
        return html[: m.start()] + new_head + html[m.end():]

    # no head: try insert before </html> or at top
    html_m = re.search(r"</html\s*>", html, re.IGNORECASE)
    if html_m:
        return html[: html_m.start()] + "\n" + link_tag + "\n" + html[html_m.start():]
    return link_tag + "\n" + html


def main():
    root = tk.Tk()
    root.withdraw()

    html_path = filedialog.askopenfilename(
        title="HTML dosyasını seç",
        filetypes=[("HTML Files", "*.html *.htm"), ("All Files", "*.*")]
    )
    if not html_path:
        return

    n = simpledialog.askinteger(
        "JS Parça Sayısı",
        "JS kaç parçaya ayrılsın? (1-50)",
        minvalue=1,
        maxvalue=50
    )
    if not n:
        return

    html_dir = os.path.dirname(html_path)
    html_name = os.path.basename(html_path)

    html_text = read_text(html_path)

    # 1) styles -> styles.css, empty style tags but keep them
    html_text, css_all = extract_and_empty_styles(html_text)
    css_path = os.path.join(html_dir, "styles.css")
    write_text(css_path, (css_all.strip() + "\n") if css_all.strip() else "")

    # add <link ...styles.css> before </head>
    html_text = ensure_styles_link_in_head(html_text)

    # 2) body scripts -> js_all, empty script tags in body but keep them
    body_m = BODY_RE.search(html_text)
    if body_m:
        body_open, body_inner, body_close = body_m.group(1), body_m.group(2), body_m.group(3)
        new_body_inner, js_all = extract_and_empty_body_scripts(body_inner)
        new_body = body_open + new_body_inner + body_close
        html_text = html_text[: body_m.start()] + new_body + html_text[body_m.end():]
    else:
        new_doc, js_all = extract_and_empty_body_scripts(html_text)
        html_text = new_doc

    # 3) split js_all into js1..jsN without breaking inside braces
    units = split_js_into_units(js_all)
    js_files_content = pack_units_into_n_files(units, n)

    js_dir = os.path.join(html_dir, "js")
    os.makedirs(js_dir, exist_ok=True)

    js_filenames = []
    for i, content in enumerate(js_files_content, start=1):
        fn = f"js{i}.js"
        js_filenames.append(fn)
        write_text(os.path.join(js_dir, fn), content.strip() + "\n" if content.strip() else "")

    # 4) insert loader script before </body>
    loader = build_loader_script(js_filenames)

    body_m2 = BODY_RE.search(html_text)
    if body_m2:
        body_open, body_inner, body_close = body_m2.group(1), body_m2.group(2), body_m2.group(3)
        if loader.strip() not in body_inner:
            body_inner = body_inner.rstrip() + "\n\n" + loader + "\n"
        html_text = html_text[: body_m2.start()] + (body_open + body_inner + body_close) + html_text[body_m2.end():]
    else:
        html_text = html_text.rstrip() + "\n\n" + loader + "\n"

    # backup then overwrite original (same directory)
    bak_path = os.path.join(html_dir, html_name + ".bak")
    try:
        if not os.path.exists(bak_path):
            shutil.copy2(html_path, bak_path)
    except Exception:
        pass

    write_text(html_path, html_text)

    messagebox.showinfo(
        "Tamam",
        f"Kaydedildi:\n- {html_name} (güncellendi)\n- styles.css\n- js/ klasörü içinde {len(js_filenames)} dosya\n\nYedek: {html_name}.bak"
    )


if __name__ == "__main__":
    main()

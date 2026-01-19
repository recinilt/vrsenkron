#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JS Dosya Bölücü ve HTML Güncelleyici
- Dizindeki JS dosyalarını tarar
- Max satır sayısını aşanları akıllıca böler (fonksiyonları bozmadan)
- HTML dosyalarındaki referansları günceller (document.write formatı dahil)
"""

import os
import re
import glob
from pathlib import Path


def split_js_into_units(js_content):
    """
    JS kodunu mantıksal birimlere (unit) ayırır.
    Süslü parantez derinliğini takip ederek fonksiyonları/objeleri bozmaz.
    """
    if not js_content.strip():
        return []
    
    lines = js_content.split('\n')
    units = []
    current = []
    brace_depth = 0
    in_string = False
    string_char = None
    in_multi_comment = False
    
    for line in lines:
        current.append(line)
        
        i = 0
        while i < len(line):
            char = line[i]
            next_char = line[i + 1] if i + 1 < len(line) else ''
            
            # Tek satır yorum kontrolü
            if not in_string and not in_multi_comment and char == '/' and next_char == '/':
                break  # Satırın geri kalanını atla
            
            # Çok satırlı yorum başlangıcı
            if not in_string and not in_multi_comment and char == '/' and next_char == '*':
                in_multi_comment = True
                i += 2
                continue
            
            # Çok satırlı yorum bitişi
            if in_multi_comment and char == '*' and next_char == '/':
                in_multi_comment = False
                i += 2
                continue
            
            if in_multi_comment:
                i += 1
                continue
            
            # String kontrolü
            if char in ['"', "'", '`'] and (i == 0 or line[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None
            
            # String içinde değilsek parantez say
            if not in_string:
                if char == '{':
                    brace_depth += 1
                elif char == '}':
                    brace_depth = max(0, brace_depth - 1)
            
            i += 1
        
        trimmed = line.strip()
        # Brace derinliği 0 ve satır ; veya } ile bitiyorsa unit tamamdır
        if brace_depth == 0 and not in_string and not in_multi_comment:
            if trimmed.endswith(';') or trimmed.endswith('}'):
                units.append('\n'.join(current) + '\n')
                current = []
    
    # Kalan satırlar varsa ekle
    if current:
        units.append('\n'.join(current) + '\n')
    
    # Çok kısa unit'leri birleştir (30 karakterden az olanları)
    merged = []
    buffer = ''
    for unit in units:
        if len(unit.strip()) < 30:
            buffer += unit
        else:
            if buffer:
                merged.append(buffer)
                buffer = ''
            merged.append(unit)
    if buffer:
        merged.append(buffer)
    
    return [u for u in merged if u.strip()]


def pack_units_into_parts(units, max_lines):
    """
    Unit'leri max satır sayısını aşmayacak şekilde parçalara ayırır.
    """
    if not units:
        return ['']
    
    parts = []
    current_part = []
    current_line_count = 0
    
    for unit in units:
        unit_lines = unit.count('\n') + (0 if unit.endswith('\n') else 1)
        
        # Eğer mevcut parça + yeni unit max'ı aşıyorsa yeni parça başlat
        if current_line_count > 0 and current_line_count + unit_lines > max_lines:
            parts.append('\n'.join(current_part) if current_part else '')
            current_part = []
            current_line_count = 0
        
        current_part.append(unit.rstrip('\n'))
        current_line_count += unit_lines
    
    # Son parçayı ekle
    if current_part:
        parts.append('\n'.join(current_part))
    
    return parts


def get_new_filenames(original_name, part_count):
    """
    Orijinal dosya adından yeni dosya adları üretir.
    js33.js -> js33-01.js, js33-02.js, js33-03.js
    """
    stem = Path(original_name).stem  # js33
    suffix = Path(original_name).suffix  # .js
    
    new_names = []
    for i in range(1, part_count + 1):
        new_names.append(f"{stem}-{i:02d}{suffix}")
    
    return new_names


def update_html_references(html_content, old_filename, new_filenames):
    """
    HTML içindeki JS referansını yeni dosyalarla değiştirir.
    Hem normal <script src> hem de document.write formatını destekler.
    """
    updated = html_content
    
    # Dosya adı (js24.js)
    escaped_filename = re.escape(old_filename)
    
    # Pattern 1: document.write('<script src="js24.js?v=' + v + '"><\/script>');
    # Tam satırı yakala - parantez ve noktalı virgül dahil
    pattern_docwrite = (
        r"(document\.write\s*\(\s*['\"]<script[^>]*src=['\"])(" + escaped_filename + r")(\?[^'\"]*)?(['\"][^>]*><\\?/script>['\"])\s*(\)\s*;?)"
    )
    
    def replace_docwrite(match):
        prefix = match.group(1)    # document.write('<script src="
        filename = match.group(2)  # js24.js
        query = match.group(3) or ''  # ?v=' + v + '
        suffix = match.group(4)    # "><\/script>'
        closing = match.group(5)   # );
        
        new_lines = []
        for new_name in new_filenames:
            new_lines.append(f"{prefix}{new_name}{query}{suffix}{closing}")
        return '\n'.join(new_lines)
    
    updated = re.sub(pattern_docwrite, replace_docwrite, updated, flags=re.IGNORECASE)
    
    # Pattern 2: Normal <script src="js24.js"></script>
    pattern_script = (
        r'(<script[^>]*src=["\'])(' + escaped_filename + r')(\?[^"\']*)?(["\'][^>]*></script>)'
    )
    
    def replace_script(match):
        prefix = match.group(1)    # <script src="
        filename = match.group(2)  # js24.js
        query = match.group(3) or ''  # ?v=123
        suffix = match.group(4)    # "></script>
        
        new_tags = []
        for new_name in new_filenames:
            new_tags.append(f'{prefix}{new_name}{query}{suffix}')
        return '\n'.join(new_tags)
    
    updated = re.sub(pattern_script, replace_script, updated, flags=re.IGNORECASE)
    
    return updated


def process_directory(directory, max_lines):
    """
    Ana işlem fonksiyonu.
    """
    # Dizindeki tüm JS dosyalarını bul
    js_files = glob.glob(os.path.join(directory, '*.js'))
    
    if not js_files:
        print("Bu dizinde JS dosyası bulunamadı.")
        return
    
    print(f"\n{len(js_files)} adet JS dosyası bulundu.")
    print("-" * 50)
    
    # Bölünen dosyaları takip et: {eski_ad: [yeni_adlar]}
    split_files = {}
    
    # Her JS dosyasını kontrol et
    for js_path in sorted(js_files):
        filename = os.path.basename(js_path)
        
        with open(js_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        line_count = content.count('\n') + 1
        
        if line_count <= max_lines:
            print(f"✓ {filename}: {line_count} satır (bölünmedi)")
            continue
        
        print(f"\n▶ {filename}: {line_count} satır (bölünecek)")
        
        # Unit'lere ayır
        units = split_js_into_units(content)
        print(f"  → {len(units)} adet kod bloğu bulundu")
        
        # Parçalara ayır
        parts = pack_units_into_parts(units, max_lines)
        part_count = len(parts)
        
        if part_count <= 1:
            print(f"  → Tek parça olarak kaldı (fonksiyonlar bölünemez)")
            continue
        
        # Yeni dosya adları oluştur
        new_names = get_new_filenames(filename, part_count)
        split_files[filename] = new_names
        
        print(f"  → {part_count} parçaya bölündü:")
        
        # Yeni dosyaları yaz
        for i, (part_content, new_name) in enumerate(zip(parts, new_names)):
            new_path = os.path.join(directory, new_name)
            part_lines = part_content.count('\n') + 1
            
            with open(new_path, 'w', encoding='utf-8') as f:
                f.write(part_content)
            
            print(f"     • {new_name} ({part_lines} satır)")
        
        # Orijinal dosyayı sil
        os.remove(js_path)
        print(f"  → Orijinal {filename} silindi")
    
    # HTML dosyalarını güncelle
    if not split_files:
        print("\n" + "=" * 50)
        print("Bölünen dosya olmadığı için HTML güncellenmedi.")
        return
    
    html_files = glob.glob(os.path.join(directory, '*.html')) + glob.glob(os.path.join(directory, '*.htm'))
    
    if not html_files:
        print("\n" + "=" * 50)
        print("Bu dizinde HTML dosyası bulunamadı.")
        return
    
    print("\n" + "=" * 50)
    print("HTML dosyaları güncelleniyor...")
    print("-" * 50)
    
    for html_path in html_files:
        html_filename = os.path.basename(html_path)
        
        with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()
        
        original_content = html_content
        changes = []
        
        for old_name, new_names in split_files.items():
            # Dosya adı HTML'de var mı kontrol et
            if old_name in html_content:
                html_content = update_html_references(html_content, old_name, new_names)
                changes.append(f"{old_name} → {', '.join(new_names)}")
        
        if html_content != original_content:
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"✓ {html_filename} güncellendi:")
            for change in changes:
                print(f"    {change}")
        else:
            print(f"- {html_filename}: Değişiklik yok")
    
    print("\n" + "=" * 50)
    print("İşlem tamamlandı!")
    print(f"Bölünen dosya sayısı: {len(split_files)}")
    total_new = sum(len(v) for v in split_files.values())
    print(f"Oluşturulan yeni dosya sayısı: {total_new}")


def main():
    print("=" * 50)
    print("   JS DOSYA BÖLÜCÜ & HTML GÜNCELLEYİCİ")
    print("=" * 50)
    
    # Çalışma dizini
    directory = os.getcwd()
    print(f"\nÇalışma dizini: {directory}")
    
    # Max satır sayısı al
    while True:
        try:
            max_lines = int(input("\nMaksimum satır sayısı girin: "))
            if max_lines < 10:
                print("En az 10 satır olmalı!")
                continue
            break
        except ValueError:
            print("Geçerli bir sayı girin!")
    
    # İşlemi başlat
    process_directory(directory, max_lines)


if __name__ == '__main__':
    main()
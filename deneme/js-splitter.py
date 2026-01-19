#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JS Dosya Bölücü ve HTML Güncelleyici
- Dizindeki JS dosyalarını tarar
- Max satır sayısını aşanları akıllıca böler (fonksiyonları bozmadan)
- HTML dosyalarındaki referansları günceller
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
    
    for line in lines:
        current.append(line)
        
        # String ve comment dışındaki { } karakterlerini say
        # Basit yaklaşım: tüm { ve } sayılır
        for char in line:
            if char == '{':
                brace_depth += 1
            elif char == '}':
                brace_depth = max(0, brace_depth - 1)
        
        trimmed = line.strip()
        # Brace derinliği 0 ve satır ; veya } ile bitiyorsa unit tamamdır
        if brace_depth == 0 and (trimmed.endswith(';') or trimmed.endswith('}')):
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
    """
    # Farklı script tag formatlarını yakala
    # <script src="js33.js"></script>
    # <script src="js/js33.js"></script>
    # <script src="js33.js?v=123"></script>
    
    # Dosya adını escape et (regex için)
    escaped_name = re.escape(old_filename)
    
    # Pattern: script tag'ini yakala (path ile veya path'siz)
    pattern = r'(<script[^>]*\ssrc=["\'])([^"\']*?)(' + escaped_name + r')(\?[^"\']*)?(["\'][^>]*>.*?</script>)'
    
    def replacement(match):
        prefix = match.group(1)      # <script src="
        path = match.group(2)        # js/ veya boş
        filename = match.group(3)    # js33.js
        query = match.group(4) or '' # ?v=123 veya boş
        suffix = match.group(5)      # "></script>
        
        # Yeni script tag'lerini oluştur
        new_tags = []
        for new_name in new_filenames:
            new_tags.append(f'{prefix}{path}{new_name}{query}{suffix}')
        
        return '\n'.join(new_tags)
    
    updated_html = re.sub(pattern, replacement, html_content, flags=re.IGNORECASE | re.DOTALL)
    
    return updated_html


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
    for js_path in js_files:
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
    
    html_files = glob.glob(os.path.join(directory, '*.html'))
    
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
        updated = False
        
        for old_name, new_names in split_files.items():
            if old_name in html_content:
                html_content = update_html_references(html_content, old_name, new_names)
                if html_content != original_content:
                    updated = True
                    print(f"✓ {html_filename}: {old_name} → {', '.join(new_names)}")
        
        if updated:
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
        else:
            # Referans var mı kontrol et
            has_ref = any(old in html_content for old in split_files.keys())
            if not has_ref:
                print(f"- {html_filename}: Bölünen dosyalara referans yok")
    
    print("\n" + "=" * 50)
    print("İşlem tamamlandı!")
    print(f"Bölünen dosya sayısı: {len(split_files)}")
    print(f"Güncellenen HTML sayısı: {len(html_files)}")


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
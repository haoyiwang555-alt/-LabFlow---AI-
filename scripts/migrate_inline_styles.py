import re

f = r'K:\项目\比赛\AI先锋未来人才大赛\public\index.html'
html = open(f, encoding='utf-8').read()
before = len(re.findall(r'style="', html))

# Simple style-only replacements
simple_pats = [
    (r'style="display:flex;align-items:center;justify-content:space-between;"', 'class="flex-between"'),
    (r'style="font-size:var\(--text-sm\);color:var\(--color-text-secondary\);?"', 'class="text-sm text-secondary"'),
    (r'style="font-size:var\(--text-base\);font-weight:600;margin-bottom:var\(--space-4\);"', 'class="text-base font-semibold mb-4"'),
    (r'style="width:48px;height:48px;border-radius:var\(--radius-lg\);background:var\(--color-bg-muted\);display:flex;align-items:center;justify-content:center;flex-shrink:0;"', 'class="icon-wrap-lg"'),
    (r'style="margin-bottom:var\(--space-1\);"', 'class="mb-1"'),
    (r'style="color:var\(--color-text-secondary\);"', 'class="text-secondary"'),
    (r'style="display:flex;align-items:center;gap:var\(--space-4\);"', 'class="flex-gap-4"'),
    (r'style="flex:1;min-width:0;"', 'class="flex-1-min"'),
    (r'style="font-weight:600;"', 'class="font-semibold"'),
    (r'style="font-size:var\(--text-xs\);color:var\(--color-text-tertiary\);"', 'class="text-xs text-tertiary"'),
    (r'style="margin-bottom:var\(--space-8\);"', 'class="mb-8"'),
    (r'style="width:7px;height:7px;border-radius:50%;background:var\(--color-border-strong\);"', 'class="dot-7"'),
    (r'style="color:var\(--color-success\);"', 'class="text-success"'),
    (r'style="display:flex;align-items:center;gap:var\(--space-1\);"', 'class="flex-gap-1"'),
    (r'style="font-size:var\(--text-xl\);font-weight:600;margin-bottom:var\(--space-4\);"', 'class="text-xl font-semibold mb-4"'),
    (r'style="height:4px;background:var\(--color-bg-muted\);border-radius:var\(--radius-full\);overflow:hidden;"', 'class="progress-track"'),
    (r'style="display:grid;grid-template-columns:80px 10px 140px 1fr auto;align-items:center;gap:var\(--space-2\);padding:var\(--space-2\) var\(--space-4\);"', 'class="grid-codex-row"'),
    (r'style="display:grid;grid-template-columns:40px 1fr 36px;align-items:center;gap:var\(--space-3\);"', 'class="grid-icon-row"'),
    (r'style="margin-top:var\(--space-1\);"', 'class="mt-1"'),
]

for pat, repl in simple_pats:
    html = re.sub(pat, repl, html)

# Handle elements that already have class="..." followed by style="..."
combo_pats = [
    (r'class="([^"]+)"\s+style="display:flex;align-items:center;justify-content:space-between;"', r'class="\1 flex-between"'),
    (r'class="([^"]+)"\s+style="font-size:var\(--text-sm\);color:var\(--color-text-secondary\);?"', r'class="\1 text-sm text-secondary"'),
    (r'class="([^"]+)"\s+style="margin-bottom:var\(--space-1\);"', r'class="\1 mb-1"'),
    (r'class="([^"]+)"\s+style="color:var\(--color-text-secondary\);"', r'class="\1 text-secondary"'),
    (r'class="([^"]+)"\s+style="flex:1;min-width:0;"', r'class="\1 flex-1-min"'),
    (r'class="([^"]+)"\s+style="font-weight:600;"', r'class="\1 font-semibold"'),
    (r'class="([^"]+)"\s+style="margin-bottom:var\(--space-8\);"', r'class="\1 mb-8"'),
    (r'class="([^"]+)"\s+style="color:var\(--color-success\);"', r'class="\1 text-success"'),
    (r'class="([^"]+)"\s+style="font-size:var\(--text-xs\);color:var\(--color-text-tertiary\);"', r'class="\1 text-xs text-tertiary"'),
    (r'class="([^"]+)"\s+style="margin-bottom:var\(--space-4\);"', r'class="\1 mb-4"'),
    (r'class="([^"]+)"\s+style="margin-top:var\(--space-1\);"', r'class="\1 mt-1"'),
    (r'class="([^"]+)"\s+style="display:flex;align-items:center;gap:var\(--space-4\);"', r'class="\1 flex-gap-4"'),
    (r'class="([^"]+)"\s+style="display:flex;align-items:center;gap:var\(--space-1\);"', r'class="\1 flex-gap-1"'),
    (r'class="([^"]+)"\s+style="font-size:var\(--text-sm\);color:var\(--color-text-tertiary\);"', r'class="\1 text-sm text-tertiary"'),
]

for pat, repl in combo_pats:
    html = re.sub(pat, repl, html)

open(f, 'w', encoding='utf-8', newline='\n').write(html)
after = len(re.findall(r'style="', html))
print(f'替换前: {before} -> 替换后: {after} (消除 {before - after} 处)')

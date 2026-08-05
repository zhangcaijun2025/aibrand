#!/bin/sh
echo "=== 找 libatomic ==="
find / -name "libatomic*" 2>/dev/null | head -5
echo "=== ldconfig 缓存 ==="
ldconfig -p 2>/dev/null | grep -i atomic
echo "=== apt 可用? ==="
command -v apt-get && echo "apt exists" || echo "no apt"
echo "=== dpkg libatomic? ==="
command -v dpkg && dpkg -l 2>/dev/null | grep -i atomic | head -3
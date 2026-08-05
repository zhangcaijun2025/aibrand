#!/bin/sh
echo "=== 常见库路径 ==="
ls /lib/x86_64-linux-gnu/libatomic* /usr/lib/x86_64-linux-gnu/libatomic* /lib64/libatomic* 2>&1
echo "=== apt ==="
command -v apt-get 2>&1
command -v dpkg 2>&1
echo "=== ldconfig ==="
ldconfig -p 2>&1 | grep -i atomic
echo "=== gcc libatomic ==="
ls /usr/lib/gcc/x86_64-linux-gnu/*/libatomic.so* 2>&1
FROM n8nio/n8n:latest
USER root
# Download static apk to bootstrap package manager
RUN cd /tmp && \
    wget -q "https://dl-cdn.alpinelinux.org/alpine/v3.22/main/x86_64/apk-tools-static-2.14.6-r2.apk" -O apk.apk && \
    tar -xzf apk.apk && \
    ./sbin/apk.static --version
USER node

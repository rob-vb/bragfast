# Hyperframes render Lambda — x86_64.
# Receives { html, variables, format, duration, presignedPutUrl }, runs the
# Hyperframes CLI against a temp project directory in /tmp, PUTs the MP4 to R2.
#
# Architecture note: Chrome-for-Testing ships only Linux x86_64 builds, so
# Puppeteer (and therefore Hyperframes) cannot download a working Chrome on
# arm64 Lambda. We use x86_64 to match what Puppeteer actually has.

FROM public.ecr.aws/lambda/nodejs:22-x86_64

# Chromium runtime deps + fonts. dnf is on AL2023.
# `which` is required: hyperframes calls `which ffmpeg` to locate the binary.
RUN dnf install -y \
      tar gzip xz which \
      fontconfig dejavu-sans-fonts liberation-fonts google-noto-sans-fonts \
      atk cups-libs at-spi2-atk libdrm libxkbcommon \
      mesa-libgbm libXcomposite libXdamage libXrandr libXfixes \
      alsa-lib pango cairo gtk3 nss \
    && dnf clean all

# Static ffmpeg + ffprobe (amd64). Hyperframes spawns these by bare name via
# PATH lookup, so install into /usr/bin which is always on Lambda's spawn PATH.
RUN curl -fsSL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o /tmp/ffmpeg.tar.xz \
    && tar -xf /tmp/ffmpeg.tar.xz -C /tmp \
    && mv /tmp/ffmpeg-*-amd64-static/ffmpeg /usr/bin/ \
    && mv /tmp/ffmpeg-*-amd64-static/ffprobe /usr/bin/ \
    && chmod +x /usr/bin/ffmpeg /usr/bin/ffprobe \
    && rm -rf /tmp/ffmpeg*

# Install hyperframes to an explicit prefix so we know where the binary lives
# regardless of the base image's npm config quirks. /usr/local/bin/hyperframes
# is the symlinked entrypoint we use at runtime. Pre-bake the headless-browser
# cache at /opt/hyperframes-cache so the handler can seed /tmp on cold start.
RUN mkdir -p /opt/hf \
    && npm install --prefix /opt/hf hyperframes@0.5.3 \
    && ln -sf /opt/hf/node_modules/.bin/hyperframes /usr/local/bin/hyperframes \
    && mkdir -p /opt/hyperframes-home \
    && HOME=/opt/hyperframes-home /usr/local/bin/hyperframes browser ensure \
    && mv /opt/hyperframes-home/.cache /opt/hyperframes-cache \
    && (rm -rf /opt/hyperframes-home || true)

# Handler. HOME is overridden to /tmp at runtime in handler.mjs because
# /var/task is read-only on Lambda but Hyperframes writes scratch files
# under HOME during render.
COPY handler.mjs ${LAMBDA_TASK_ROOT}/
COPY package.json ${LAMBDA_TASK_ROOT}/

CMD [ "handler.handler" ]

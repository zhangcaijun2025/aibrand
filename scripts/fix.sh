#!/bin/sh
# Add mongodb.logger require with try/catch
cat > /app/libs/common/src/loggers/index.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
tslib_1.__exportStar(require("./cloud-watch.logger"), exports);
tslib_1.__exportStar(require("./console.logger"), exports);
tslib_1.__exportStar(require("./feishu.logger"), exports);
try { tslib_1.__exportStar(require("./mongodb.logger"), exports); } catch(e) { /* winston optional */ }
//# sourceMappingURL=index.js.map
EOF
echo "loggers/index.js fixed"

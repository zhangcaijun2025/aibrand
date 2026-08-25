import type { Plugin } from 'vite'
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { transform } from '@swc/core'
import { defineConfig } from 'vitest/config'

/**
 * NestJS 装饰器依赖 design:type 元数据 — esbuild 不产出，用 SWC 转换。
 * 避开 unplugin-swc → unplugin → acorn 的损坏依赖链，直接集成 @swc/core。
 */
function swcDecoratorsPlugin(): Plugin {
  return {
    name: 'swc-decorators',
    enforce: 'pre',
    async transform(code, id) {
      if (id.includes('node_modules') || !/\.(m?ts|tsx)$/.test(id))
        return
      const out = await transform(code, {
        filename: id,
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
            tsx: id.endsWith('x'),
          },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
          keepClassNames: true,
        },
        module: { type: 'es6' },
        sourceMaps: true,
      })
      return { code: out.code, map: out.map }
    },
  }
}

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/aitoearn-server',
  plugins: [
    swcDecoratorsPlugin(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
  ],
  test: {
    name: 'aitoearn-server',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reportsDirectory: '../../coverage/apps/aitoearn-server',
      provider: 'v8' as const,
    },
  },
}))

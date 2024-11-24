/*
 * @Author: nzgw
 * @Date: 2024-11-24 20:21:38
 * @LastEditors: nzgw
 * @LastEditTime: 2024-11-24 21:09:10
 * @FilePath: \DomainTimeRPG\vite.config.ts
 * @Description: 
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { copyFileSync, mkdirSync } from 'fs';


export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        popup: resolve(__dirname, 'src/popup.ts'),

      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'style.css';
          }
          return '[name][extname]';
        },
        entryFileNames: '[name].js',
        format: 'es',
        dir: 'dist',
      }
    },
    target: 'esnext',
    minify: false
  },
  plugins: [
    {
      name: 'copy-manifest',
      generateBundle: () => {
        fs.writeFileSync(
          resolve(__dirname, 'dist', 'manifest.json'),
          fs.readFileSync(resolve(__dirname, 'manifest.json'), 'utf-8')
        );
      },
    },
    {
      name: 'copy-popup',
      generateBundle: () => {
        fs.writeFileSync(
          resolve(__dirname, 'dist', 'popup.html'),
          fs.readFileSync(resolve(__dirname, 'popup.html'), 'utf-8')
        );
      },
    },
    {
      name: 'copy-icons',
      generateBundle: () => {
        const iconsDir = resolve(__dirname, 'icons');
        const distIconsDir = resolve(__dirname, 'dist', 'icons');

        // 创建 dist/icons 目录
        mkdirSync(distIconsDir, { recursive: true });

        // 复制 icons 目录下的文件
        fs.readdirSync(iconsDir).forEach((file) => {
          copyFileSync(
            resolve(iconsDir, file),
            resolve(distIconsDir, file)
          );
        });
      },
    },
  ],
});
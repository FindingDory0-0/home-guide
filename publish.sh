#!/bin/zsh
# 원본 문서를 암호화해서 GitHub Pages에 올린다.  사용: ./publish.sh "변경 내용"
set -e
cd "$(dirname "$0")"
node tools/build.mjs
git add -A
git commit -m "${1:-문서 업데이트}"
git push

# 開発ルール

## 固定ルール

| 優先度 | ルール | 補足 |
| ------ | ------ | ---- |
| 🔴 最高 | 思考・出力・コード内コメントはすべて日本語 | 変数名・ファイル名は英語可 |
| 🔴 最高 | WebアプリはGitHub Pages + GitHub Actionsでデプロイ | 他のホスティングは使用不可 |
| 🔴 最高 | CSSフレームワークはTailwind CSS（CDN可）、カラーは白系ベース | 他のフレームワーク併用不可 |
| 🟡 高 | Step数が10を超えたら進捗確認・判断を仰ぐ | 自動で次のステップに進まない |
| 🟡 高 | 複雑なタスクはImplementation Plan提示→合意後に実装 | アプリ作成・複数ファイル変更など |
| 🟢 通常 | 動作確認は自動承認でよい / プラスアルファ提案は合意後に実装 | |

## Webアプリ開発

- リポジトリ: `mkt918/[プロジェクト名]`、GitHubアカウント: `mkt918`
- EDINET API Key: `43f1d406817e4f3285ad3c3b9202c70b`
- deploy.yml: `build`と`deploy`を2ジョブに分離、`workflow_dispatch`を必ず含める

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: "."
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```

## データ管理

- 動的データ保存・処理が必要な場合はGAS + Googleスプレッドシートを採用
- 用途: 教育目的・授業での活用、最大40人同時接続
- GAS無料枠: スクリプト実行6分/日、URLフェッチ20,000回/日
- アーキテクチャ: GitHub Pages（静的配信）→ GAS（動的処理）→ スプレッドシート（データ永続化）

## 出力基準

- 定型作業は必ずバッチ化・スクリプト化する
- 複雑な情報はMermaid図解やHTML/CSSインフォグラフィックで視覚化する

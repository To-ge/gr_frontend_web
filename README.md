# gr_frontend_web
卒業研究のフロントエンド（Web）のプログラム

## 概要
私の大学では毎年一度ハイブリッドロケットの打ち上げを行なっています。
私はこのプロジェクトに関わり、「リアルタイムロケット軌道表示(RTTD)システムの開発と評価」という研究テーマに取り組みました。
ロケットに搭載した人工衛星で取得した位置情報をリアルタイムにブラウザのマップUI上に表示することができます。
このリポジトリはRTTDシステムのフロントエンドを担っています。

## RTTDシステムイメージ図

![RTTDシステムイメージ図](/docs/image/sys-image.png)

## 使用技術

| Category          | Technology Stack             |
| ----------------- | ---------------------------- |
| Main              | TypeScript, Next.js          |
| Map               | deck.gl                      |
| Style             | TailwindCSS                  |
| Infrastructure    | Vercel                       |

## システム構成図

![システム構成図](/docs/image/sys-arch.png)

### 関連リポジトリ
- [バックエンド](https://github.com/To-ge/gr_backend_go)
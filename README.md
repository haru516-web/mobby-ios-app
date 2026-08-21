# Mobby House

モビーたちの暮らしを覗き、ちょっかいへの反応を思い出として集める、無料プレイの箱庭ゲームMVPです。モビー本体はThree.jsのプロシージャル3Dモデルで動きます。iPhoneのApp Store版Expo Goに合わせてExpo SDK 54を使用しています。

## すぐに開発を始める

PowerShellでプロジェクトフォルダを開きます。

```powershell
cd C:\Users\User\Documents\mobby\mobby-ios-app
npm install
npm run start:go -- --clear
```

同じWi-Fi上のiPhoneでExpo Goを開く場合は、`start:go` が表示するQRコードを読み取ります。Expo CLIのネットワーク診断が失敗する環境では、代わりに次を使えます。

```powershell
npm run start:go:offline -- --clear
```

Expo Go用サーバーはWeb確認用の8081番ポートと分けて、8083番ポートで起動します。

Windowsのブラウザ／Codexのサイドブラウザで確認する場合は、別のPowerShellで次を実行します。起動後に表示された `http://localhost:8081` をブラウザで開いてください。

```powershell
npm run web:side
```

すでに `npm start` が起動中なら、そのターミナルで `w` を押してWeb表示へ切り替えても構いません。iPhone用のExpo GoサーバーとWeb用サーバーは別々に起動できます。

## iPhoneで遊ぶ（無料）

1. iPhoneに無料のExpo Goをインストールする
2. WindowsとiPhoneを同じWi-Fiに接続する
3. `npm run start:go -- --clear` で表示されたQRコードをExpo Goで読み取る

Expo Goで読み取れないときは、ターミナルの接続モードを `LAN` にして再起動してください。Windowsファイアウォールが表示された場合は、Node.jsのプライベートネットワーク通信を許可します。

3D表示はiPhone本体のGLで描画するため、開発メニューのChromeリモートデバッグはオフにしてください。

このMVPはExpo Goで動く範囲の構成なので、Apple Developer登録、Mac、Xcode、EASログイン、決済SDKは必要ありません。

## 実装済みの遊び

- もびりん、もびち、病みモビー、もびやん、もびゆら、れおもび、ぽてもび、モビ坊、ばぶもびの9種
- Three.js + React Three Fiber + Expo GLによる立体モビーモデル
- ちょっかいに合わせた揺れ、びっくり、ジャンプ、ゆっくり回転の反応演出
- モビーをタップする「ちょっかい」
- そっと構う、家具を動かす、プレゼントの4種類の干渉
- クッション、植物、テレビ、机、本棚による部屋の変化
- その場で起きた出来事の思い出アルバムへの記録
- 9種のモビー図鑑
- モビーごとに集める「ちょっかい図鑑」（36種類）
- 自分の部屋に名前をつけるローカルカスタマイズ

キャラクター名・役割・口調・反応は `main-characters/info/` の2つのMDを参照して実装しています。画像は `assets/mobies/` にアプリ用の静的アセットとして配置しています。

3Dモデルは `src/components/Mobby3DScene.tsx` にあり、9種共通のカメラ顔・レンズ・十字キー・ボタンに、キャラクター別アクセサリーを合成しています。Blenderや有料の3D制作サービスは必須ではありません。

## 検証

```powershell
npx tsc --noEmit
npm run lint
npx expo-doctor@latest
npx expo export --platform web --output-dir dist
```

課金機能は現在実装していません。今後追加する場合も、無料で遊べるコアループを壊さない前提で別途設計します。

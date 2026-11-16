# 消える灯りの部屋

three.js で作った、1部屋だけのブラウザ脱出ゲーム。ビルドは不要で、このフォルダをそのまま静的配信できる。

## 遊び方

扉は4桁のコードでロックされている。視点の先にあるものを調べ、手がかりを揃えて入力する。

- ドラッグで視点
- WASD / 矢印、または画面左下のボタンで移動
- クリック、または E で調べる

## ローカルで開く

```powershell
cd G:\work\tanaru\escape-room
python -m http.server 8765
```

ブラウザで http://localhost:8765/ を開く。`file://` ではモジュールが読めない。

## Tanaru へ出す

しりとりや4桁ナンバー当てと同じ、静的アプリの出し方。

1. GitHub に空の `maenomeri/escape-room` を作る（README や license は足さない）
2. このフォルダを `main` に push する
3. Tanaru でアプリ ID `escape-room` を有効にする（`index.html` の `data-app-id` と一致）

公開パスは `/apps/escape-room/`。`tanaru.json` と `thumbnail.svg` がアプリの名前とサムネイルになる。

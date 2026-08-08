# 2D furniture assets

The `*.png` files are the final transparent sprites used by the app. Their matching `*-source.png` files are the original chroma-key renders kept for asset provenance. The source renders were generated with the built-in ImageGen tool on a flat green background and converted locally with `remove_chroma_key.py`.

The `user-furniture-sheet-source.png` file is the furniture sheet supplied in the conversation. It is preserved unchanged; `user-furniture-sheet.png` is its locally keyed version. The reproducible crop map is `scripts/split_user_furniture_sheet.py`.

| App item | Sprite |
| --- | --- |
| クッション | `cushion-pile.png` |
| テレビ | `television.png` |
| ソファ | `user-sofa-blue.png` |
| 植物 | `user-plant.png` |
| 小さな机 | `user-coffee-table.png` |
| 本棚 | `user-bookshelf.png` |
| フロアランプ | `user-floor-lamp.png` |
| ベッド | `user-bed-blue.png` |
| キャビネット | `user-cabinet-olive.png` |
| ラグ | `user-rug-round.png` |
| マグカップ | `user-mug-blue.png` |
| 本の山 | `user-books-stack.png` |
| 箱 | `user-box-closed.png` |
| 開いた箱 | `user-box-open.png` |

`sofa-sage.png`, `plant-sage.png`, `coffee-table.png`, `bookshelf.png`, and `floor-lamp.png` are retained as earlier generated fallback sprites but are no longer selected by the manifest.

The TypeScript manifest is `src/data/roomAssets.ts`; do not hard-code sprite paths in screens.

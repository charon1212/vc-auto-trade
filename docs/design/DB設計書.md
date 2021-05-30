# DB設計書

本システムで利用する Amazon DynamoDB のDB設計を記載する。

注意点として、設計者がNoSQLに初挑戦でよくわからない状態なので、設計が結構厳しい状態。一応実用上は動くと思うので、それで我慢する。

## PKとSK

RDB設計が頭から抜けないので…下記のように使う。たぶんもっといい設計があるが、わからない。

- PK…RDBのテーブル名のような役割として使う。下記のフォーマットに従う。  
`<プロダクトコード><テーブル名>`  
テーブル名は、別に記載する。
- SK…RDBのレコードのIDのような役割として使う。文字列で、PKごとに割り当てるデータを変更する。

## テーブル一覧

※プロダクトコードをPCと略します。

| テーブル | PK | SK |
|:--:|:--|:--|
| コンテキスト | `<PC>CONTEXT` | `context` |
| 短期集計約定 | `<PC>EXEC` | `<timestamp>` |
| 長期集計約定 | `<PC>LONG_EXEC` | `<timestamp>` |
| 注文 | `<PC>ORDER` | `<state><timestamp>` |

### コンテキスト

プロダクトごとのアプリケーションコンテキストを保存する。今の段階では使い道が弱いが、とりあえずおいてる。

- PK
  - PKは固定値で、`<PC>CONTEXT`とする。
- SK
  - SKは固定値で、`context`とする。

実装：[context.ts](../../lib/lambda/Interfaces/AWS/Dynamodb/context.ts)

### 短期集計約定

10秒間隔で集計した約定履歴を保存する。

- PK
  - PKは固定値で、`<PC>EXEC`とする。
- SK
  - SKは集計期間の開始点の Unix timestamp とする。(本当は固定長に設計すべきだが、Unix timestamp で運用を開始してしまった。次に Unix timestamp の桁が上がるのは`2286年11月21日 02:46:40`らしく、多分生きてないのでいったん放置する。生きてたら修正する。)

### 長期集計約定

1時間間隔で集計した約定履歴を保存する。

- PK
  - PKは固定値で、`<PC>LONG_EXEC`とする。
- SK
  - SKは集計期間の開始点の Unix timestamp とする。

### 注文

本システムが発注した注文を保存する。

- PK
  - PKは固定値で、`<PC>ORDER`とする。
- SK
  - SKは`<state><timestamp><acceptanceId>`とする。ただし、stateは次に示す状態コード(3文字固定長)とする。timestampは、発注を本システムが行った時点のUnix timestampとする。acceptanceIdは、注文の受付IDで、25桁の固定長とする。

| 状態コード | 状態 | 意味 |
| :--:| :-- | :--|
| UNK | UNKOWN | 発注後、状態を確認できていない |
| ACT | ACTIVE | 有効 |
| REJ | REJECTED | 発注が正常に行われなかった |
| COM | COMPLETED | 約定した |
| CAN | CANCELED | キャンセルが行われた |
| EXP | EXPIRED | 有効期限が切れた |

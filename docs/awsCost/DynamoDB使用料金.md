# DynamoDBの料金メモ

DynamoDBの料金について簡単にまとめたメモ。他者への説明を意識したものではない点に注意。

## 基本

DynamoDBの利用にかかる料金は2種類。データの操作とデータの保管。

## データの保管

データの保管にかかる料金は、月に最初の25GByteまで無料。

### VCATの場合のデータ保管

最も支配的なデータ量は、「約定履歴の保存」。毎分取得したデータをためていく。典型的なデータは下記のような形になる。

```json
[{"M":{"buySize":{"N":"0"},"price":{"N":"0"},"sellSize":{"N":"0"},"timestamp":{"N":"1623760080000"},"totalSize":{"N":"0"}}},{"M":{"buySize":{"N":"0"},"price":{"N":"0"},"sellSize":{"N":"0"},"timestamp":{"N":"1623760090000"},"totalSize":{"N":"0"}}},{"M":{"buySize":{"N":"0"},"price":{"N":"0"},"sellSize":{"N":"0"},"timestamp":{"N":"1623760100000"},"totalSize":{"N":"0"}}},{"M":{"buySize":{"N":"0"},"price":{"N":"0"},"sellSize":{"N":"0"},"timestamp":{"N":"1623760110000"},"totalSize":{"N":"0"}}},{"M":{"buySize":{"N":"0"},"price":{"N":"0"},"sellSize":{"N":"0"},"timestamp":{"N":"1623760120000"},"totalSize":{"N":"0"}}},{"M":{"buySize":{"N":"0"},"price":{"N":"0"},"sellSize":{"N":"0"},"timestamp":{"N":"1623760130000"},"totalSize":{"N":"0"}}}]
```

上記は、コンソールの形をそのままコピーして半角スペースを取り除いたもの。実際にどういった形で保持しているかはわからないが、上記が739文字なので余裕を少し持たせて「分速2KByte」とする。

概算は下記の通り。

- 1分で2KByteのデータを保存する。
- 1カ月で86.4MByteのデータを保存する。
- この速度だと、25GByteを超過するのは、289カ月 = 24年で、ほぼ無視できる。

実際は他にもデータを保存したり、開発環境/本番環境の構成をとるが、それでも1・2年で無料枠を超えないと想定される。

## データの操作

データ操作にかかる料金は、キャパシティーユニット(以下、単にCU)という独自単位で記録される。CUの計算は後述。

計算は下記の通り。

- 1秒あたり25CUまでが無料枠。ただし、後述のバーストキャパシティの概念がある。
- DynamoDBのテーブルごとに、書き込みと読み込みの秒間CUを事前にプロビジョニング(予約)しておく必要がある。プロビジョニングした範囲でしか利用できないし、プロビジョニングした分は未使用でも課金対象。
- ある1秒で使われなかったCUも、すぐになくなるわけではなく、最大5分間(300秒)保持される。つまり、事前に全くCU消費がなければ、5CUでプロビジョニングしたDynamoDBに300×5 = 1500CUの操作が1秒間で行える。

### CUの計算

- 読み込み(弱い整合性)…2回で1CU。ただし、4KBごとに1回の読み込みとカウントするため、17KBの読み込みは2.125CU→実質3CUを消費する。
- 読み込み(強い整合性)…1回で1CU。ただし、4KBごとに1回の読み込みとカウントする。
- 書き込み…1回で1CU。ただし、1KBごとに1回の書き込みとしてカウントする。
- 検索…4KBごとに1CU。

また、「グローバルセカンダリインデックス」を使った読み込み書き込みを行うと、別途CUが必要となる。しかし、VCATでは使っていないため無視する。

### VCATの場合のデータ操作

本番・開発環境攻勢をとるとすると、1DBにプロビジョニングできるのは10CUである。したがって、1分で使用できるのは書き込みと読み込みのそれぞれで600CUである。

データ書き込むは、注文情報・死活情報・約定情報など様々ではあるが、600CUに達することは無いと思われる。支配的なデータが特になく、せいぜい10～20CUである。

データ読み込みで支配的な物は、過去に保存した約定を取得する処理である。データ保管でも記載した通り、1分当たりの約定情報は多くとも2KBなので、CU計算は何分前のデータまで取得したいかに依存する。

- 1分前までなら2KB→1CU
- 1時間前までなら120KB→30CU
- 10時間前までなら1200KB→300CU
- 1日前までなら2880KB→720CU

したがって、半日前のデータであれば取得できると思われる。

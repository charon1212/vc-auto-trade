/**
 * 基準時刻を管理するクラス。
 */
export class StandardTime {

  /** 計算用定数 */
  private static readonly minuteByMilliseconds = 60 * 1000;
  private static readonly hourByMilliseconds = 60 * 60 * 1000;
  /** 基準時刻のUnix Timestamp */
  private now: number;
  private std: number;
  private stdHour: number;
  constructor(now: number) {
    this.now = now;
    this.std = Math.floor(now / StandardTime.minuteByMilliseconds) * StandardTime.minuteByMilliseconds;
    this.stdHour = Math.floor(now / StandardTime.hourByMilliseconds) * StandardTime.hourByMilliseconds;
  }

  getNow() {
    return this.now;
  }
  getStd() {
    return this.std;
  }
  getStdBefore1Min() {
    return this.std - StandardTime.minuteByMilliseconds;
  }
  getHourStd() {
    return this.stdHour;
  }
  getHourStdBefore1Hour() {
    return this.stdHour - StandardTime.hourByMilliseconds;
  }

};

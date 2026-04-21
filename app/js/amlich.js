// Âm lịch — Vietnamese Lunar Calendar conversion
// Based on the algorithm by Hồ Ngọc Đức (http://www.informatik.uni-leipzig.de/~duc/amlich/)
// Timezone: GMT+7 (Vietnam)

(function(global){
  'use strict';

  const PI = Math.PI;

  function INT(d){ return Math.floor(d); }

  function jdFromDate(dd, mm, yy){
    const a = INT((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12*a - 3;
    let jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - INT(y/100) + INT(y/400) - 32045;
    if (jd < 2299161) jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - 32083;
    return jd;
  }

  function jdToDate(jd){
    let a, b, c;
    if (jd > 2299160){
      a = jd + 32044;
      b = INT((4*a+3)/146097);
      c = a - INT((b*146097)/4);
    } else {
      b = 0; c = jd + 32082;
    }
    const d = INT((4*c+3)/1461);
    const e = c - INT((1461*d)/4);
    const m = INT((5*e+2)/153);
    const day = e - INT((153*m+2)/5) + 1;
    const month = m + 3 - 12*INT(m/10);
    const year = b*100 + d - 4800 + INT(m/10);
    return [day, month, year];
  }

  function NewMoon(k){
    const T = k/1236.85;
    const T2 = T*T;
    const T3 = T2*T;
    const dr = PI/180;
    let Jd1 = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3;
    Jd1 = Jd1 + 0.00033*Math.sin((166.56 + 132.87*T - 0.009173*T2)*dr);
    const M = 359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3;
    const Mpr = 306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3;
    const F = 21.2964 + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3;
    let C1 = (0.1734 - 0.000393*T)*Math.sin(M*dr) + 0.0021*Math.sin(2*dr*M);
    C1 = C1 - 0.4068*Math.sin(Mpr*dr) + 0.0161*Math.sin(dr*2*Mpr);
    C1 = C1 - 0.0004*Math.sin(dr*3*Mpr);
    C1 = C1 + 0.0104*Math.sin(dr*2*F) - 0.0051*Math.sin(dr*(M+Mpr));
    C1 = C1 - 0.0074*Math.sin(dr*(M-Mpr)) + 0.0004*Math.sin(dr*(2*F+M));
    C1 = C1 - 0.0004*Math.sin(dr*(2*F-M)) - 0.0006*Math.sin(dr*(2*F+Mpr));
    C1 = C1 + 0.001*Math.sin(dr*(2*F-Mpr)) + 0.0005*Math.sin(dr*(2*Mpr+M));
    let deltat;
    if (T < -11) deltat = 0.001 + 0.000839*T + 0.0002261*T2 - 0.00000845*T3 - 0.000000081*T*T3;
    else deltat = -0.000278 + 0.000265*T + 0.000262*T2;
    return Jd1 + C1 - deltat;
  }

  function SunLongitude(jdn){
    const T = (jdn - 2451545.0)/36525;
    const T2 = T*T;
    const dr = PI/180;
    const M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2;
    const L0 = 280.46645 + 36000.76983*T + 0.0003032*T2;
    let DL = (1.914600 - 0.004817*T - 0.000014*T2)*Math.sin(dr*M);
    DL = DL + (0.019993 - 0.000101*T)*Math.sin(dr*2*M) + 0.000290*Math.sin(dr*3*M);
    let L = L0 + DL;
    L = L*dr;
    L = L - PI*2*INT(L/(PI*2));
    return L;
  }

  function getSunLongitude(dayNumber, timeZone){
    return INT(SunLongitude(dayNumber - 0.5 - timeZone/24) / PI * 6);
  }

  function getNewMoonDay(k, timeZone){
    return INT(NewMoon(k) + 0.5 + timeZone/24);
  }

  function getLunarMonth11(yy, timeZone){
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    const sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) nm = getNewMoonDay(k-1, timeZone);
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone){
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0, i = 1, arc = getSunLongitude(getNewMoonDay(k+i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k+i, timeZone), timeZone);
    } while (arc != last && i < 14);
    return i - 1;
  }

  function convertSolar2Lunar(dd, mm, yy, timeZone){
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k+1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);
    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy-1, timeZone); }
    else { lunarYear = yy+1; b11 = getLunarMonth11(yy+1, timeZone); }
    const lunarDay = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11)/29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365){
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) { lunarMonth = diff + 10; if (diff == leapMonthDiff) lunarLeap = 1; }
    }
    if (lunarMonth > 12) lunarMonth = lunarMonth - 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap, jd: dayNumber };
  }

  // Can Chi
  const CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

  function canChiNam(y){ return CAN[(y+6)%10] + ' ' + CHI[(y+8)%12]; }
  function canChiThang(m, y){
    const canY = (y+6)%10;
    return CAN[(canY*2+m+1)%10] + ' ' + CHI[(m+1)%12];
  }
  function canChiNgay(jd){
    return CAN[(jd+9)%10] + ' ' + CHI[(jd+1)%12];
  }
  // Giờ / Ngày hoàng đạo — theo Lục Diệu truyền thống (Ngọc Hạp Thông Thư)
  // 12 vị thần quay vòng theo chi: Thanh Long(H), Minh Đường(H), Thiên Hình(h),
  // Chu Tước(h), Kim Quỹ(H), Bảo Quang(H), Bạch Hổ(h), Ngọc Đường(H),
  // Thiên Lao(h), Huyền Vũ(h), Tư Mệnh(H), Câu Trận(h) — H=hoàng, h=hắc
  const LUC_DIEU_HOANG_POS = new Set([0, 1, 4, 5, 7, 10]);

  // Thanh Long khởi ở đâu — áp dụng cả cho chi ngày (xác định giờ hoàng đạo)
  // và chi tháng (xác định ngày hoàng đạo). Câu thiệu:
  //   Dần-Thân khởi Tý,  Mão-Dậu khởi Dần,  Thìn-Tuất khởi Thìn,
  //   Tỵ-Hợi  khởi Ngọ, Tý-Ngọ  khởi Thân, Sửu-Mùi khởi Tuất.
  const THANH_LONG_START = {
    'Dần': 0,  'Thân': 0,    // khởi Tý
    'Mão': 2,  'Dậu': 2,     // khởi Dần
    'Thìn': 4, 'Tuất': 4,    // khởi Thìn
    'Tỵ': 6,   'Hợi': 6,     // khởi Ngọ
    'Tý': 8,   'Ngọ': 8,     // khởi Thân
    'Sửu': 10, 'Mùi': 10     // khởi Tuất
  };

  function isLucDieuHoang(contextChi, targetIdx){
    const start = THANH_LONG_START[contextChi];
    if (start === undefined) return false;
    const offset = (targetIdx - start + 12) % 12;
    return LUC_DIEU_HOANG_POS.has(offset);
  }

  const GIO_RANGE = ['23-1','1-3','3-5','5-7','7-9','9-11','11-13','13-15','15-17','17-19','19-21','21-23'];

  function gioHoangDao(jd){
    const chiDay = CHI[(jd+1)%12];
    return CHI.map((c, i) => ({
      name: c,
      range: GIO_RANGE[i],
      good: isLucDieuHoang(chiDay, i)
    }));
  }

  function isHoangDaoDay(lunarMonth, jd){
    const monthChi = CHI[(lunarMonth+1)%12];
    const dayIdx = (jd+1) % 12;
    return isLucDieuHoang(monthChi, dayIdx);
  }

  // Tiết khí — 24 solar terms
  const TIET_KHI = [
    'Xuân phân','Thanh minh','Cốc vũ','Lập hạ','Tiểu mãn','Mang chủng',
    'Hạ chí','Tiểu thử','Đại thử','Lập thu','Xử thử','Bạch lộ',
    'Thu phân','Hàn lộ','Sương giáng','Lập đông','Tiểu tuyết','Đại tuyết',
    'Đông chí','Tiểu hàn','Đại hàn','Lập xuân','Vũ thủy','Kinh trập'
  ];

  function getTietKhi(jd, timeZone){
    return TIET_KHI[getSunLongitude(jd+1, timeZone)];
  }

  // Public API
  global.AmLich = {
    convert: (d,m,y) => convertSolar2Lunar(d,m,y,7),
    canChiNgay,
    canChiThang,
    canChiNam,
    gioHoangDao,
    isHoangDaoDay,
    getTietKhi: (jd) => getTietKhi(jd, 7),
    jdFromDate,
    CAN, CHI, TIET_KHI
  };
})(window);

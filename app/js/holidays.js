// Holidays — Vietnamese holidays (solar + lunar + international)
(function(global){
  'use strict';

  // Solar holidays: key "MM-DD"
  const SOLAR = {
    '01-01': { name: 'Tết Dương lịch', kind: 'off', tag: 'NGHỈ' },
    '02-03': { name: 'Ngày thành lập Đảng', kind: 'note' },
    '02-14': { name: 'Valentine', kind: 'intl' },
    '03-08': { name: 'Quốc tế Phụ nữ', kind: 'intl' },
    '03-26': { name: 'Ngày thành lập Đoàn', kind: 'note' },
    '04-30': { name: 'Giải phóng miền Nam', kind: 'off', tag: 'NGHỈ' },
    '05-01': { name: 'Quốc tế Lao động', kind: 'off', tag: 'NGHỈ' },
    '05-07': { name: 'Chiến thắng Điện Biên Phủ', kind: 'note' },
    '05-19': { name: 'Sinh nhật Bác Hồ', kind: 'note' },
    '06-01': { name: 'Quốc tế Thiếu nhi', kind: 'intl' },
    '07-27': { name: 'Thương binh Liệt sĩ', kind: 'note' },
    '09-02': { name: 'Quốc khánh', kind: 'off', tag: 'NGHỈ' },
    '10-20': { name: 'Phụ nữ Việt Nam', kind: 'intl' },
    '11-20': { name: 'Nhà giáo Việt Nam', kind: 'intl' },
    '12-22': { name: 'Thành lập QĐND', kind: 'note' },
    '12-24': { name: 'Giáng sinh (Noel eve)', kind: 'intl' },
    '12-25': { name: 'Giáng sinh', kind: 'intl' }
  };

  // Lunar holidays: key "LM-LD"
  // Giao thừa KHÔNG hardcode ở đây — tính động trong rawHolidays() vì tháng Chạp
  // có thể chỉ 29 ngày (những năm đó ngày '12-30' không tồn tại).
  const LUNAR = {
    '01-01': { name: 'Mùng 1 Tết Nguyên Đán', kind: 'off', tag: 'TẾT' },
    '01-02': { name: 'Mùng 2 Tết', kind: 'off', tag: 'TẾT' },
    '01-03': { name: 'Mùng 3 Tết', kind: 'off', tag: 'TẾT' },
    '01-15': { name: 'Rằm tháng Giêng (Tết Nguyên Tiêu)', kind: 'tradition' },
    '03-03': { name: 'Tết Hàn thực', kind: 'tradition' },
    '03-10': { name: 'Giỗ Tổ Hùng Vương', kind: 'off', tag: 'NGHỈ' },
    '05-05': { name: 'Tết Đoan Ngọ', kind: 'tradition' },
    '07-07': { name: 'Thất tịch', kind: 'tradition' },
    '07-15': { name: 'Lễ Vu Lan', kind: 'tradition' },
    '08-15': { name: 'Tết Trung Thu', kind: 'tradition' },
    '09-09': { name: 'Tết Trùng Cửu', kind: 'tradition' },
    '10-10': { name: 'Tết Thường Tân', kind: 'tradition' },
    '12-23': { name: 'Ông Công Ông Táo', kind: 'tradition' }
  };

  function pad(n){ return n<10 ? '0'+n : ''+n; }

  // Lễ đúng ngày (không tính nghỉ bù) — dùng chung cho getHolidays và logic bù.
  // Tách ra để logic bù có thể gọi lên ngày Chủ Nhật mà không bị đệ quy.
  function rawHolidays(solarD, solarM, solarY, lunar){
    const out = [];
    const sKey = pad(solarM)+'-'+pad(solarD);
    if (SOLAR[sKey]) out.push(SOLAR[sKey]);
    if (!lunar.leap){
      const lKey = pad(lunar.month)+'-'+pad(lunar.day);
      if (LUNAR[lKey]) out.push(LUNAR[lKey]);
      // Giao thừa = ngày cuối tháng Chạp (29 hoặc 30 đều tính).
      // Verify bằng cách check ngày mai âm lịch có phải mùng 1 tháng Giêng không.
      if (lunar.month === 12 && (lunar.day === 29 || lunar.day === 30)){
        const tom = new Date(solarY, solarM-1, solarD+1);
        const luTom = AmLich.convert(tom.getDate(), tom.getMonth()+1, tom.getFullYear());
        if (luTom.day === 1 && luTom.month === 1){
          out.push({ name: 'Giao thừa (Tết)', kind: 'off', tag: 'TẾT' });
        }
      }
    }
    return out;
  }

  function getHolidays(solarD, solarM, solarY, lunar){
    const out = rawHolidays(solarD, solarM, solarY, lunar);

    // Nghỉ bù — BLLĐ 2019 Điều 112 khoản 3: ngày nghỉ lễ trùng ngày nghỉ hằng tuần
    // (mặc định Chủ Nhật) thì nghỉ bù vào ngày làm việc kế tiếp.
    // Baseline: lễ kind='off' rơi Chủ Nhật → Thứ Hai là nghỉ bù.
    // Caveat: Chính phủ có thể công bố bù kép cho Tết dài ngày — không auto-detect.
    const dow = new Date(solarY, solarM-1, solarD).getDay();
    if (dow === 1){ // Thứ Hai
      const y = new Date(solarY, solarM-1, solarD-1);
      const luY = AmLich.convert(y.getDate(), y.getMonth()+1, y.getFullYear());
      const yHols = rawHolidays(y.getDate(), y.getMonth()+1, y.getFullYear(), luY);
      for (const h of yHols){
        if (h.kind === 'off') out.push({ name: 'Nghỉ bù ' + h.name, kind: 'off', tag: 'BÙ' });
      }
    }

    // Rằm (15) và mùng 1 (1) mọi tháng — chỉ nếu chưa có lễ âm lịch cùng ngày
    const lKey = pad(lunar.month)+'-'+pad(lunar.day);
    if (lunar.day === 1 && !LUNAR[lKey]) out.push({ name: 'Mùng 1 Â.L', kind: 'ritual' });
    if (lunar.day === 15 && !LUNAR[lKey]) out.push({ name: 'Rằm Â.L', kind: 'ritual' });
    return out;
  }

  function isOffDay(solarD, solarM, solarY, lunar){
    // returns true if it's a legal day-off (weekend or public holiday)
    const date = new Date(solarY, solarM-1, solarD);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) return 'weekend';
    const h = getHolidays(solarD, solarM, solarY, lunar);
    for (const hh of h) if (hh.kind === 'off') return 'holiday';
    return null;
  }

  // Compute remaining workdays in month & next holiday
  function monthStats(solarY, solarM){
    const last = new Date(solarY, solarM, 0).getDate();
    let work = 0, off = 0;
    for (let d=1; d<=last; d++){
      const lu = AmLich.convert(d, solarM, solarY);
      const off_ = isOffDay(d, solarM, solarY, lu);
      if (off_) off++; else work++;
    }
    return { work, off, total: last };
  }

  function nextHoliday(fromDate){
    const d0 = new Date(fromDate);
    for (let i=0; i<400; i++){
      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()+i);
      const lu = AmLich.convert(d.getDate(), d.getMonth()+1, d.getFullYear());
      const hols = getHolidays(d.getDate(), d.getMonth()+1, d.getFullYear(), lu);
      for (const h of hols){
        if (h.kind === 'off') return { date: d, holiday: h, daysAway: i };
      }
    }
    return null;
  }

  global.Holidays = { getHolidays, isOffDay, monthStats, nextHoliday, SOLAR, LUNAR };
})(window);

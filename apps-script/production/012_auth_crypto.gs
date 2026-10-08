function auth01Utf8Bytes(value) {
  const text = String(value == null ? "" : value);
  const bytes = [];
  for (let index = 0; index < text.length; index++) {
    let point = text.codePointAt(index);
    if (point > 0xffff) index++;
    if (point >= 0xd800 && point <= 0xdfff) point = 0xfffd;
    if (point <= 0x7f) bytes.push(point);
    else if (point <= 0x7ff) {
      bytes.push(0xc0 | (point >>> 6), 0x80 | (point & 0x3f));
    } else if (point <= 0xffff) {
      bytes.push(0xe0 | (point >>> 12), 0x80 | ((point >>> 6) & 0x3f), 0x80 | (point & 0x3f));
    } else {
      bytes.push(
        0xf0 | (point >>> 18), 0x80 | ((point >>> 12) & 0x3f),
        0x80 | ((point >>> 6) & 0x3f), 0x80 | (point & 0x3f)
      );
    }
  }
  return bytes;
}

function auth01RotateRight(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}

const AUTH01_SHA256_IV = Object.freeze([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
const AUTH01_SHA256_WORDS = new Uint32Array(64);

// SHA-256/HMAC/PBKDF2 structure adapted from @noble/hashes 2.3.0 (MIT),
// pinned npm shasum 505fd39c3134a37e67c8c4e6c6049a496154879c. The compact
// implementation remains self-contained for Apps Script V8 and is checked by
// published PBKDF2-HMAC-SHA-256 known-answer vectors. The SHA-256 round core is
// mechanically unrolled to reduce V8 loop overhead without changing the algorithm.
function auth01Sha256Rounds(hash) {
  const w = AUTH01_SHA256_WORDS;
  { const x=w[1], y=w[14]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[16]=(w[0]+s0+w[9]+s1)>>>0; }
  { const x=w[2], y=w[15]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[17]=(w[1]+s0+w[10]+s1)>>>0; }
  { const x=w[3], y=w[16]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[18]=(w[2]+s0+w[11]+s1)>>>0; }
  { const x=w[4], y=w[17]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[19]=(w[3]+s0+w[12]+s1)>>>0; }
  { const x=w[5], y=w[18]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[20]=(w[4]+s0+w[13]+s1)>>>0; }
  { const x=w[6], y=w[19]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[21]=(w[5]+s0+w[14]+s1)>>>0; }
  { const x=w[7], y=w[20]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[22]=(w[6]+s0+w[15]+s1)>>>0; }
  { const x=w[8], y=w[21]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[23]=(w[7]+s0+w[16]+s1)>>>0; }
  { const x=w[9], y=w[22]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[24]=(w[8]+s0+w[17]+s1)>>>0; }
  { const x=w[10], y=w[23]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[25]=(w[9]+s0+w[18]+s1)>>>0; }
  { const x=w[11], y=w[24]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[26]=(w[10]+s0+w[19]+s1)>>>0; }
  { const x=w[12], y=w[25]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[27]=(w[11]+s0+w[20]+s1)>>>0; }
  { const x=w[13], y=w[26]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[28]=(w[12]+s0+w[21]+s1)>>>0; }
  { const x=w[14], y=w[27]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[29]=(w[13]+s0+w[22]+s1)>>>0; }
  { const x=w[15], y=w[28]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[30]=(w[14]+s0+w[23]+s1)>>>0; }
  { const x=w[16], y=w[29]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[31]=(w[15]+s0+w[24]+s1)>>>0; }
  { const x=w[17], y=w[30]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[32]=(w[16]+s0+w[25]+s1)>>>0; }
  { const x=w[18], y=w[31]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[33]=(w[17]+s0+w[26]+s1)>>>0; }
  { const x=w[19], y=w[32]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[34]=(w[18]+s0+w[27]+s1)>>>0; }
  { const x=w[20], y=w[33]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[35]=(w[19]+s0+w[28]+s1)>>>0; }
  { const x=w[21], y=w[34]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[36]=(w[20]+s0+w[29]+s1)>>>0; }
  { const x=w[22], y=w[35]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[37]=(w[21]+s0+w[30]+s1)>>>0; }
  { const x=w[23], y=w[36]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[38]=(w[22]+s0+w[31]+s1)>>>0; }
  { const x=w[24], y=w[37]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[39]=(w[23]+s0+w[32]+s1)>>>0; }
  { const x=w[25], y=w[38]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[40]=(w[24]+s0+w[33]+s1)>>>0; }
  { const x=w[26], y=w[39]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[41]=(w[25]+s0+w[34]+s1)>>>0; }
  { const x=w[27], y=w[40]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[42]=(w[26]+s0+w[35]+s1)>>>0; }
  { const x=w[28], y=w[41]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[43]=(w[27]+s0+w[36]+s1)>>>0; }
  { const x=w[29], y=w[42]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[44]=(w[28]+s0+w[37]+s1)>>>0; }
  { const x=w[30], y=w[43]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[45]=(w[29]+s0+w[38]+s1)>>>0; }
  { const x=w[31], y=w[44]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[46]=(w[30]+s0+w[39]+s1)>>>0; }
  { const x=w[32], y=w[45]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[47]=(w[31]+s0+w[40]+s1)>>>0; }
  { const x=w[33], y=w[46]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[48]=(w[32]+s0+w[41]+s1)>>>0; }
  { const x=w[34], y=w[47]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[49]=(w[33]+s0+w[42]+s1)>>>0; }
  { const x=w[35], y=w[48]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[50]=(w[34]+s0+w[43]+s1)>>>0; }
  { const x=w[36], y=w[49]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[51]=(w[35]+s0+w[44]+s1)>>>0; }
  { const x=w[37], y=w[50]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[52]=(w[36]+s0+w[45]+s1)>>>0; }
  { const x=w[38], y=w[51]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[53]=(w[37]+s0+w[46]+s1)>>>0; }
  { const x=w[39], y=w[52]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[54]=(w[38]+s0+w[47]+s1)>>>0; }
  { const x=w[40], y=w[53]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[55]=(w[39]+s0+w[48]+s1)>>>0; }
  { const x=w[41], y=w[54]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[56]=(w[40]+s0+w[49]+s1)>>>0; }
  { const x=w[42], y=w[55]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[57]=(w[41]+s0+w[50]+s1)>>>0; }
  { const x=w[43], y=w[56]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[58]=(w[42]+s0+w[51]+s1)>>>0; }
  { const x=w[44], y=w[57]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[59]=(w[43]+s0+w[52]+s1)>>>0; }
  { const x=w[45], y=w[58]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[60]=(w[44]+s0+w[53]+s1)>>>0; }
  { const x=w[46], y=w[59]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[61]=(w[45]+s0+w[54]+s1)>>>0; }
  { const x=w[47], y=w[60]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[62]=(w[46]+s0+w[55]+s1)>>>0; }
  { const x=w[48], y=w[61]; const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3); const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10); w[63]=(w[47]+s0+w[56]+s1)>>>0; }
  let a=hash[0], b=hash[1], c=hash[2], d=hash[3], e=hash[4], f=hash[5], g=hash[6], h=hash[7];
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x428a2f98+w[0])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x71374491+w[1])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0xb5c0fbcf+w[2])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0xe9b5dba5+w[3])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x3956c25b+w[4])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x59f111f1+w[5])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x923f82a4+w[6])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0xab1c5ed5+w[7])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0xd807aa98+w[8])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x12835b01+w[9])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x243185be+w[10])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x550c7dc3+w[11])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x72be5d74+w[12])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x80deb1fe+w[13])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x9bdc06a7+w[14])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0xc19bf174+w[15])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0xe49b69c1+w[16])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0xefbe4786+w[17])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x0fc19dc6+w[18])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x240ca1cc+w[19])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x2de92c6f+w[20])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x4a7484aa+w[21])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x5cb0a9dc+w[22])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x76f988da+w[23])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x983e5152+w[24])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0xa831c66d+w[25])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0xb00327c8+w[26])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0xbf597fc7+w[27])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0xc6e00bf3+w[28])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0xd5a79147+w[29])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x06ca6351+w[30])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x14292967+w[31])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x27b70a85+w[32])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x2e1b2138+w[33])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x4d2c6dfc+w[34])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x53380d13+w[35])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x650a7354+w[36])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x766a0abb+w[37])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x81c2c92e+w[38])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x92722c85+w[39])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0xa2bfe8a1+w[40])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0xa81a664b+w[41])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0xc24b8b70+w[42])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0xc76c51a3+w[43])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0xd192e819+w[44])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0xd6990624+w[45])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0xf40e3585+w[46])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x106aa070+w[47])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x19a4c116+w[48])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x1e376c08+w[49])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x2748774c+w[50])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x34b0bcb5+w[51])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x391c0cb3+w[52])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0x4ed8aa4a+w[53])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0x5b9cca4f+w[54])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0x682e6ff3+w[55])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^(~e&g); const t1=(h+s1+ch+0x748f82ee+w[56])>>>0; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); d=(d+t1)>>>0; h=(t1+s0+maj)>>>0; }
  { const s1=((d>>>6)|(d<<26))^((d>>>11)|(d<<21))^((d>>>25)|(d<<7)); const ch=(d&e)^(~d&f); const t1=(g+s1+ch+0x78a5636f+w[57])>>>0; const s0=((h>>>2)|(h<<30))^((h>>>13)|(h<<19))^((h>>>22)|(h<<10)); const maj=(h&a)^(h&b)^(a&b); c=(c+t1)>>>0; g=(t1+s0+maj)>>>0; }
  { const s1=((c>>>6)|(c<<26))^((c>>>11)|(c<<21))^((c>>>25)|(c<<7)); const ch=(c&d)^(~c&e); const t1=(f+s1+ch+0x84c87814+w[58])>>>0; const s0=((g>>>2)|(g<<30))^((g>>>13)|(g<<19))^((g>>>22)|(g<<10)); const maj=(g&h)^(g&a)^(h&a); b=(b+t1)>>>0; f=(t1+s0+maj)>>>0; }
  { const s1=((b>>>6)|(b<<26))^((b>>>11)|(b<<21))^((b>>>25)|(b<<7)); const ch=(b&c)^(~b&d); const t1=(e+s1+ch+0x8cc70208+w[59])>>>0; const s0=((f>>>2)|(f<<30))^((f>>>13)|(f<<19))^((f>>>22)|(f<<10)); const maj=(f&g)^(f&h)^(g&h); a=(a+t1)>>>0; e=(t1+s0+maj)>>>0; }
  { const s1=((a>>>6)|(a<<26))^((a>>>11)|(a<<21))^((a>>>25)|(a<<7)); const ch=(a&b)^(~a&c); const t1=(d+s1+ch+0x90befffa+w[60])>>>0; const s0=((e>>>2)|(e<<30))^((e>>>13)|(e<<19))^((e>>>22)|(e<<10)); const maj=(e&f)^(e&g)^(f&g); h=(h+t1)>>>0; d=(t1+s0+maj)>>>0; }
  { const s1=((h>>>6)|(h<<26))^((h>>>11)|(h<<21))^((h>>>25)|(h<<7)); const ch=(h&a)^(~h&b); const t1=(c+s1+ch+0xa4506ceb+w[61])>>>0; const s0=((d>>>2)|(d<<30))^((d>>>13)|(d<<19))^((d>>>22)|(d<<10)); const maj=(d&e)^(d&f)^(e&f); g=(g+t1)>>>0; c=(t1+s0+maj)>>>0; }
  { const s1=((g>>>6)|(g<<26))^((g>>>11)|(g<<21))^((g>>>25)|(g<<7)); const ch=(g&h)^(~g&a); const t1=(b+s1+ch+0xbef9a3f7+w[62])>>>0; const s0=((c>>>2)|(c<<30))^((c>>>13)|(c<<19))^((c>>>22)|(c<<10)); const maj=(c&d)^(c&e)^(d&e); f=(f+t1)>>>0; b=(t1+s0+maj)>>>0; }
  { const s1=((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)); const ch=(f&g)^(~f&h); const t1=(a+s1+ch+0xc67178f2+w[63])>>>0; const s0=((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)); const maj=(b&c)^(b&d)^(c&d); e=(e+t1)>>>0; a=(t1+s0+maj)>>>0; }
  hash[0]=(hash[0]+a)>>>0; hash[1]=(hash[1]+b)>>>0; hash[2]=(hash[2]+c)>>>0; hash[3]=(hash[3]+d)>>>0;
  hash[4]=(hash[4]+e)>>>0; hash[5]=(hash[5]+f)>>>0; hash[6]=(hash[6]+g)>>>0; hash[7]=(hash[7]+h)>>>0;
}

function auth01Sha256Compress(hash, bytes, offset) {
  const words = AUTH01_SHA256_WORDS;
  for (let index = 0; index < 16; index++) {
    const at = offset + index * 4;
    words[index] = (
      (bytes[at] << 24) | (bytes[at + 1] << 16) |
      (bytes[at + 2] << 8) | bytes[at + 3]
    ) >>> 0;
  }
  auth01Sha256Rounds(hash);
}

function auth01Sha256FromState(prefixState, prefixLength, input) {
  const message = Uint8Array.from(input || [], value => Number(value) & 0xff);
  const totalLength = prefixLength + message.length;
  const paddedLength = Math.ceil((message.length + 1 + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const bitLength = totalLength * 8;
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  const at = padded.length - 8;
  padded[at] = (high >>> 24) & 0xff; padded[at + 1] = (high >>> 16) & 0xff;
  padded[at + 2] = (high >>> 8) & 0xff; padded[at + 3] = high & 0xff;
  padded[at + 4] = (low >>> 24) & 0xff; padded[at + 5] = (low >>> 16) & 0xff;
  padded[at + 6] = (low >>> 8) & 0xff; padded[at + 7] = low & 0xff;
  const hash = prefixState.slice();
  for (let offset = 0; offset < padded.length; offset += 64) {
    auth01Sha256Compress(hash, padded, offset);
  }
  return hash;
}

function auth01Sha256StateToBytes(hash) {
  const output = [];
  hash.forEach(word => {
    output.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  });
  return output;
}

function auth01Sha256Bytes(input) {
  return auth01Sha256StateToBytes(auth01Sha256FromState(AUTH01_SHA256_IV, 0, input));
}

function auth01PrepareHmacSha256(keyInput) {
  let key = Array.prototype.slice.call(keyInput || []).map(value => Number(value) & 0xff);
  if (key.length > 64) key = auth01Sha256Bytes(key);
  const innerPad = new Uint8Array(64);
  const outerPad = new Uint8Array(64);
  for (let index = 0; index < 64; index++) {
    const value = index < key.length ? key[index] : 0;
    innerPad[index] = value ^ 0x36;
    outerPad[index] = value ^ 0x5c;
  }
  const innerState = AUTH01_SHA256_IV.slice();
  const outerState = AUTH01_SHA256_IV.slice();
  auth01Sha256Compress(innerState, innerPad, 0);
  auth01Sha256Compress(outerState, outerPad, 0);
  const innerBlock = new Uint8Array(64);
  const outerBlock = new Uint8Array(64);
  const innerHashScratch = new Uint32Array(8);
  const outerHashScratch = new Uint32Array(8);

  function digestInto(messageInput, output) {
    const message = messageInput || [];
    if (message.length <= 55) {
      innerBlock.fill(0);
      for (let index = 0; index < message.length; index++) innerBlock[index] = Number(message[index]) & 0xff;
      innerBlock[message.length] = 0x80;
      const innerBits = (64 + message.length) * 8;
      innerBlock[60] = (innerBits >>> 24) & 0xff; innerBlock[61] = (innerBits >>> 16) & 0xff;
      innerBlock[62] = (innerBits >>> 8) & 0xff; innerBlock[63] = innerBits & 0xff;
      for (let index = 0; index < 8; index++) innerHashScratch[index] = innerState[index];
      auth01Sha256Compress(innerHashScratch, innerBlock, 0);

      outerBlock.fill(0);
      for (let index = 0; index < 8; index++) {
        const word = innerHashScratch[index];
        const at = index * 4;
        outerBlock[at] = (word >>> 24) & 0xff; outerBlock[at + 1] = (word >>> 16) & 0xff;
        outerBlock[at + 2] = (word >>> 8) & 0xff; outerBlock[at + 3] = word & 0xff;
      }
      outerBlock[32] = 0x80;
      outerBlock[62] = 0x03;
      outerBlock[63] = 0x00;
      for (let index = 0; index < 8; index++) outerHashScratch[index] = outerState[index];
      auth01Sha256Compress(outerHashScratch, outerBlock, 0);
      for (let index = 0; index < 8; index++) {
        const word = outerHashScratch[index];
        const at = index * 4;
        output[at] = (word >>> 24) & 0xff; output[at + 1] = (word >>> 16) & 0xff;
        output[at + 2] = (word >>> 8) & 0xff; output[at + 3] = word & 0xff;
      }
      return output;
    }
    const innerDigest = auth01Sha256StateToBytes(
      auth01Sha256FromState(innerState, 64, message)
    );
    const result = auth01Sha256StateToBytes(auth01Sha256FromState(outerState, 64, innerDigest));
    for (let index = 0; index < result.length; index++) output[index] = result[index];
    return output;
  }
  // Fast path for PBKDF2 U2..Uc: every message is exactly one 32-byte HMAC output.
  // This preserves HMAC-SHA-256 semantics while avoiding generic message packing
  // in the 599,999 repeated rounds of the 600k runtime policy.
  function digest32Into(message, output) {
    const words = AUTH01_SHA256_WORDS;
    words[0] = ((message[0] << 24) | (message[1] << 16) | (message[2] << 8) | message[3]) >>> 0;
    words[1] = ((message[4] << 24) | (message[5] << 16) | (message[6] << 8) | message[7]) >>> 0;
    words[2] = ((message[8] << 24) | (message[9] << 16) | (message[10] << 8) | message[11]) >>> 0;
    words[3] = ((message[12] << 24) | (message[13] << 16) | (message[14] << 8) | message[15]) >>> 0;
    words[4] = ((message[16] << 24) | (message[17] << 16) | (message[18] << 8) | message[19]) >>> 0;
    words[5] = ((message[20] << 24) | (message[21] << 16) | (message[22] << 8) | message[23]) >>> 0;
    words[6] = ((message[24] << 24) | (message[25] << 16) | (message[26] << 8) | message[27]) >>> 0;
    words[7] = ((message[28] << 24) | (message[29] << 16) | (message[30] << 8) | message[31]) >>> 0;
    words[8] = 0x80000000; words[9] = 0; words[10] = 0; words[11] = 0;
    words[12] = 0; words[13] = 0; words[14] = 0; words[15] = 0x00000300;
    for (let index = 0; index < 8; index++) innerHashScratch[index] = innerState[index];
    auth01Sha256Rounds(innerHashScratch);

    words[0] = innerHashScratch[0]; words[1] = innerHashScratch[1];
    words[2] = innerHashScratch[2]; words[3] = innerHashScratch[3];
    words[4] = innerHashScratch[4]; words[5] = innerHashScratch[5];
    words[6] = innerHashScratch[6]; words[7] = innerHashScratch[7];
    words[8] = 0x80000000; words[9] = 0; words[10] = 0; words[11] = 0;
    words[12] = 0; words[13] = 0; words[14] = 0; words[15] = 0x00000300;
    for (let index = 0; index < 8; index++) outerHashScratch[index] = outerState[index];
    auth01Sha256Rounds(outerHashScratch);

    for (let index = 0; index < 8; index++) {
      const word = outerHashScratch[index];
      const at = index * 4;
      output[at] = (word >>> 24) & 0xff; output[at + 1] = (word >>> 16) & 0xff;
      output[at + 2] = (word >>> 8) & 0xff; output[at + 3] = word & 0xff;
    }
    return output;
  }

  const prepared = function auth01PreparedHmac(messageInput) {
    return Array.from(digestInto(messageInput, new Uint8Array(32)));
  };
  prepared.digestInto = digestInto;
  prepared.digest32Into = digest32Into;
  return prepared;
}

function auth01HmacSha256Bytes(keyInput, messageInput) {
  return auth01PrepareHmacSha256(keyInput)(messageInput);
}

function auth01Pbkdf2HmacSha256(passwordBytes, saltBytes, iterations, derivedKeyLength) {
  const count = Number(iterations);
  const length = Number(derivedKeyLength);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(length) || length < 1 || length > 1024) {
    throw auth01Error("AUTH01_KDF_PARAMETERS_INVALID", "PBKDF2 parameters are invalid.");
  }
  const hmac = auth01PrepareHmacSha256(passwordBytes);
  const output = [];
  const salt = Array.prototype.slice.call(saltBytes || []);
  const blocks = Math.ceil(length / 32);
  for (let blockIndex = 1; blockIndex <= blocks; blockIndex++) {
    const block = salt.concat([
      (blockIndex >>> 24) & 0xff, (blockIndex >>> 16) & 0xff,
      (blockIndex >>> 8) & 0xff, blockIndex & 0xff
    ]);
    let current = hmac.digestInto(block, new Uint8Array(32));
    let next = new Uint8Array(32);
    const derived = current.slice();
    for (let round = 1; round < count; round++) {
      hmac.digest32Into(current, next);
      const swap = current; current = next; next = swap;
      for (let index = 0; index < derived.length; index++) derived[index] ^= current[index];
    }
    for (let index = 0; index < derived.length && output.length < length; index++) output.push(derived[index]);
  }
  return output;
}

function auth01SignedBytes(bytes) {
  return Array.prototype.slice.call(bytes || []).map(value => {
    const normalized = Number(value) & 0xff;
    return normalized > 127 ? normalized - 256 : normalized;
  });
}

function auth01Base64UrlEncode(bytes) {
  return String(Utilities.base64EncodeWebSafe(auth01SignedBytes(bytes)) || "").replace(/=+$/g, "");
}

function auth01Base64UrlDecodeCanonical(value) {
  const text = String(value || "");
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text) || /=/.test(text)) return null;
  try {
    const bytes = Array.prototype.slice.call(Utilities.base64DecodeWebSafe(text))
      .map(item => Number(item) & 0xff);
    return auth01Base64UrlEncode(bytes) === text ? bytes : null;
  } catch (error) {
    return null;
  }
}

function auth01BytesToHex(bytes) {
  return Array.prototype.slice.call(bytes || []).map(value => (`0${(Number(value) & 0xff).toString(16)}`).slice(-2)).join("");
}

function auth01HexToBytes(value) {
  const text = String(value || "");
  if (!/^[a-f0-9]+$/.test(text) || text.length % 2) return null;
  const bytes = [];
  for (let index = 0; index < text.length; index += 2) bytes.push(parseInt(text.slice(index, index + 2), 16));
  return bytes;
}

function auth01ConstantTimeEqual(left, right) {
  const a = Array.prototype.slice.call(left || []);
  const b = Array.prototype.slice.call(right || []);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= (Number(a[index]) & 0xff) ^ (Number(b[index]) & 0xff);
  return difference === 0;
}


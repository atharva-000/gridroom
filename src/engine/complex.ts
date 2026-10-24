// minimal complex math for the power flow

export interface Complex { re: number; im: number }

export const c = (re: number, im = 0): Complex => ({ re, im });

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });

export const sub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });

export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const div = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) throw new Error('Complex division by zero');
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};

export const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

export const abs = (a: Complex): number => Math.hypot(a.re, a.im);

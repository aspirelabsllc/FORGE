import { Quicksand, Vujahday_Script } from 'next/font/google';

export const vujahdayScript = Vujahday_Script({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

// Rounded geometric monoline wordmark, in the spirit of the original Onlook logotype.
export const wordmarkFont = Quicksand({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

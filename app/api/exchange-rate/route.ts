import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type FrankfurterRate = {
  date?: string;
  base?: string;
  quote?: string;
  rate?: number;
};

const CODE = /^[A-Z]{3}$/;

export async function GET(request: NextRequest) {
  const from = (request.nextUrl.searchParams.get("from") ?? "EUR").toUpperCase();
  const to = (request.nextUrl.searchParams.get("to") ?? "EUR").toUpperCase();

  if (!CODE.test(from) || !CODE.test(to)) {
    return NextResponse.json({ error: "Invalid currency code." }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({
      base: from,
      quote: to,
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      source: "identity",
    });
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json(
        { error: body || `No exchange rate is available for ${from}/${to}.` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as FrankfurterRate;
    const rate = Number(data.rate);

    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "The exchange-rate provider returned an invalid rate." }, { status: 502 });
    }

    return NextResponse.json({
      base: data.base ?? from,
      quote: data.quote ?? to,
      rate,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      source: "Frankfurter",
    });
  } catch {
    return NextResponse.json(
      { error: "The exchange-rate service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

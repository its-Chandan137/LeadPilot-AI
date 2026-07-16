import { NextResponse } from "next/server";
import type { ApiResponse } from "@leadpilot/types";

export function ok<T>(data: T) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    {
      headers: corsHeaders()
    }
  );
}

export function fail(error: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    {
      status,
      headers: corsHeaders()
    }
  );
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Cookie, X-Requested-With, X-CSRF-Token"
  };
}

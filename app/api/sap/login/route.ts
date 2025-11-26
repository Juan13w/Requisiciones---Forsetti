import { NextResponse } from "next/server";
import { loginToSAP } from "@/services/sapService";

export async function GET() {
  try {
    const session = await loginToSAP();
    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error al conectar a SAP:", error);
    return NextResponse.json(
      { message: "No se pudo conectar a SAP" },
      { status: 500 }
    );
  }
}

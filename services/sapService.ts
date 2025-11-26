import sapConfig from "@/lib/config/sap.json";

export async function loginToSAP() {
  const body = {
    CompanyDB: process.env.SAP_COMPANY_DB,
    UserName: process.env.SAP_USERNAME,
    Password: process.env.SAP_PASSWORD
  };

  const response = await fetch(sapConfig.loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Error al iniciar sesión en SAP: ${response.status}`);
  }

  return response.json();
}

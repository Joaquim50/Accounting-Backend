async function main() {
  try {
    // Get token
    const loginRes = await fetch("http://localhost:5173/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@mipl.com", password: "password123" }) // Assuming default admin
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    
    if (!token) {
      console.log("Login failed", loginData);
      return;
    }

    const res = await fetch("http://localhost:5173/api/payments/bulk", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        payments: [{
          paymentFrequency: "RECURRING",
          expenseDate: "2026-05-20",
          expenseType: "Other",
          partyType: "VENDOR",
          vendorId: "65b4c19a-9e11-4775-9781-9b161350a8a6", // this is a dummy ID, maybe it will fail foreign key constraint
          baseAmount: 5000,
          gstApplicable: false,
          deductionType: "NONE",
          paidAmount: 0,
          paymentStatus: "PENDING"
        }]
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch(e) {
    console.error(e);
  }
}
main();

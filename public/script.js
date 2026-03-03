document.addEventListener("DOMContentLoaded", async () => {
  const userRes = await fetch("/me");
  const user = await userRes.json();
  if(user.error) window.location.href="/";
  else document.getElementById("welcome").innerText = `Welcome, ${user.username}`;

  loadSales();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await fetch("/logout");
  window.location.href="/";
});

document.getElementById("saleForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  const res = await fetch("/add-sale", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(formData)
  });
  const data = await res.json();
  if(data.success) {
    alert("Sale added!");
    e.target.reset();
    loadSales();
  } else alert("Error adding sale");
});

async function loadSales() {
  const res = await fetch("/sales");
  const sales = await res.json();
  const salesList = document.getElementById("salesList");
  salesList.innerHTML = "";
  sales.forEach(s => {
    const div = document.createElement("div");
    div.className = "sale-card";
    div.innerHTML = `
      <strong>${s.date}</strong> - Total: ${s.total}<br>
      AMC:${s.amc} MTF:${s.mtf} CS:${s.cs} EW:${s.ew} DCarbon:${s.dcarbon} Cotting:${s.cotting} OIL:${s.oil}
    `;
    salesList.appendChild(div);
  });

  drawMonthlyChart(sales);
}

function drawMonthlyChart(sales) {
  const ctx = document.getElementById("monthlyChart");
  if(!ctx) return;

  const months = [...new Set(sales.map(s=>s.month))];
  const totals = months.map(m=> sales.filter(s=>s.month==m).reduce((a,b)=>a+b.total*1,0));

  new Chart(ctx, {
    type:'bar',
    data:{
      labels: months,
      datasets:[{
        label:"Monthly Total",
        data: totals,
        backgroundColor:"#1565c0"
      }]
    },
    options:{responsive:true, maintainAspectRatio:false}
  });
}
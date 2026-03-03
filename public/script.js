let currentUser = null;

// Dark mode toggle
const darkToggle = document.getElementById("darkToggle");
darkToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// Check logged in
async function checkLogin() {
  const res = await fetch("/me");
  const data = await res.json();
  if (data.error) return window.location.href = "/login.html";
  currentUser = data;
  document.getElementById("welcome").innerText = `Welcome, ${currentUser.username}`;
  loadSales();
}
checkLogin();

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await fetch("/logout");
  window.location.href = "/login.html";
});

// Submit sale
document.getElementById("itemForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const body = Object.fromEntries(new FormData(form).entries());
  const res = await fetch("/add-sale", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if(data.success){
    showToast("Sale added successfully ✅");
    form.reset();
    loadSales();
  } else showToast("Failed to add sale ❌");
});

// Toast notifications
function showToast(msg){
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

// Load sales and render charts
async function loadSales(){
  const res = await fetch("/sales");
  const data = await res.json();

  // --- Daily sales list ---
  const salesList = document.getElementById("salesList");
  salesList.innerHTML = "";
  data.forEach(d=>{
    const card = document.createElement("div");
    card.className = "daily-card";
    card.innerHTML = `
      <strong>${d.date}</strong><br>
      AMC: ${d.amc}, MTF: ${d.mtf}, CS: ${d.cs}, EW+: ${d.ew}, D Carbon: ${d.dcarbon}, Cotting: ${d.cotting}, OIL: ${d.oil}, Total: ${d.total}
    `;
    salesList.appendChild(card);
  });

  // --- Charts ---
  renderCharts(data);
}

// Render monthly and daily charts
function renderCharts(data){
  const products = ["amc","mtf","cs","ew","dcarbon","cotting","oil"];
  const colors = ["#1565c0","#1e88e5","#64b5f6","#ff8a65","#ffb74d","#81c784","#aed581"];

  // Monthly chart
  const months = [...new Set(data.map(d=>d.month))].sort((a,b)=>a-b);
  const monthlyDatasets = products.map((p,i)=>({
    label:p.toUpperCase(),
    data: months.map(m => data.filter(d=>d.month==m).reduce((acc,b)=>acc+Number(b[p]||0),0)),
    backgroundColor: colors[i]
  }));
  const ctx1 = document.getElementById("monthlyChart").getContext("2d");
  if(window.monthlyChart) window.monthlyChart.destroy();
  window.monthlyChart = new Chart(ctx1,{
    type:"bar",
    data:{labels:months,datasets:monthlyDatasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{position:"bottom"}},
      scales:{y:{beginAtZero:true}}
    }
  });

  // Daily chart
  const dailyLabels = data.map(d=>d.date);
  const dailyDatasets = products.map((p,i)=>({
    label:p.toUpperCase(),
    data:data.map(d=>Number(d[p]||0)),
    borderColor: colors[i],
    backgroundColor: colors[i]+"77",
    fill:true,
    tension:0.3
  }));
  const ctx2 = document.getElementById("dailyChart").getContext("2d");
  if(window.dailyChart) window.dailyChart.destroy();
  window.dailyChart = new Chart(ctx2,{
    type:"line",
    data:{labels:dailyLabels,datasets:dailyDatasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{position:"bottom"}},
      scales:{y:{beginAtZero:true}}
    }
  });
}
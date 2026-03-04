let currentUser = null;
let salesData = [];
const products = ["amc","mtf","cs","ew","dcarbon","cotting","oil"];
const colors = ["#1565c0","#1e88e5","#64b5f6","#ff8a65","#ffb74d","#81c784","#aed581"];

// --- TOAST ---
function showToast(msg,color="#1e88e5"){
  const t = document.createElement("div");
  t.className = "toast";
  t.style.background = color;
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

// --- TODAY DATE (IST) ---
const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const yyyy = nowIST.getFullYear();
const mm = String(nowIST.getMonth() + 1).padStart(2, "0");
const dd = String(nowIST.getDate()).padStart(2, "0");
const todayStr = `${yyyy}-${mm}-${dd}`;
document.getElementById("todayDate").innerText = todayStr;

// --- CHECK LOGIN ---
async function checkLogin(){
  const res = await fetch("/api/me");
  const data = await res.json();
  if(data.error) return window.location.href="/api/login";
  currentUser = data.username;
  document.getElementById("welcome").innerText = `Welcome, ${currentUser}`;
  await loadSales();
}
checkLogin();

// --- LOGOUT ---
document.getElementById("logoutBtn").addEventListener("click", async ()=>{
  await fetch("/api/logout");
  window.location.href="/api/login";
});

// --- POPUP ---
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupConfirm = document.getElementById("popupConfirm");
const popupCancel = document.getElementById("popupCancel");

function showPopup(message){
  return new Promise(resolve=>{
    popupText.innerText = message;
    popup.style.display="flex";
    popupConfirm.onclick=()=>{ popup.style.display="none"; resolve(true); };
    popupCancel.onclick=()=>{ popup.style.display="none"; resolve(false); };
  });
}

// --- SUBMIT SALE ---
document.getElementById("itemForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const form = e.target;
  const body = Object.fromEntries(new FormData(form).entries());

  // Check if already added today
  const existing = salesData.find(s=>s.date===todayStr);
  if(existing){
    const confirmEdit = await showPopup(`Today's sales already exist. Update entry for ${todayStr}?`);
    if(!confirmEdit) return;
    body.editDate = todayStr;
  }

  const res = await fetch("/api/add-sale",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if(data.success){
    showToast(existing ? `Entry for ${todayStr} updated ✅` : "Sales submitted successfully ✅");
    form.reset();
    await loadSales();
  } else showToast("Error submitting sale ❌","red");
});

// --- LOAD SALES ---
async function loadSales(){
  const res = await fetch("/api/sales");
  salesData = await res.json();

  const dailyMap = {};
  salesData.forEach(d=>{ dailyMap[d.date]=d; });
  const combinedData = Object.values(dailyMap).sort((a,b)=>new Date(a.date)-new Date(b.date));

  const todayEntry = combinedData.find(d=>d.date===todayStr);
  if(todayEntry){
    const form = document.getElementById("itemForm");
    for(let key in todayEntry){
      if(form[key]) form[key].value = todayEntry[key];
    }
  }

  const salesList = document.getElementById("salesList");
  salesList.innerHTML="";
  combinedData.forEach(d=>{
    const card = document.createElement("div");
    card.className="daily-card";
    card.innerHTML=`
      <div class="line-box">
        <strong>${d.date}</strong><br>
        AMC: ${d.amc}, MTF: ${d.mtf}, CS: ${d.cs}, EW+: ${d.ew}, D Carbon: ${d.dcarbon}, Cotting: ${d.cotting}, OIL: ${d.oil}
      </div>`;
    salesList.appendChild(card);
  });

  renderTotalsBox(combinedData);
  renderMonthlyChart(combinedData);
}

// --- RENDER TOTALS BOX ---
function renderTotalsBox(data){
  const totalsContent = document.getElementById("totalsContent");
  const totals = products.map(p=>`${p.toUpperCase()}: ${data.reduce((acc,d)=>acc+Number(d[p]||0),0)}`);
  totalsContent.innerHTML = totals.join(" | ");
}

// --- RENDER MONTHLY CHART ---
function renderMonthlyChart(data){
  data.forEach(d=>{
    if(!d.date) return;
    const dateObj = new Date(new Date(d.date).toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));
    d.month = dateObj.getMonth() + 1;
  });

  const months = [...new Set(data.map(d=>d.month))].sort((a,b)=>a-b);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabels = months.map(m=>monthNames[m-1]);

  const monthlyDatasets = products.map((p,i)=>({
    label: p.toUpperCase(),
    data: months.map(m=>
      data.filter(d=>d.month === m).reduce((acc,b)=>acc + Number(b[p]||0),0)
    ),
    backgroundColor: colors[i]
  }));

  const ctx = document.getElementById("monthlyChart").getContext("2d");
  if(window.monthlyChart) window.monthlyChart.destroy();
  window.monthlyChart = new Chart(ctx,{
    type:"bar",
    data:{labels:monthLabels, datasets:monthlyDatasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{position:"bottom"}},
      scales:{y:{beginAtZero:true}}
    }
  });
}
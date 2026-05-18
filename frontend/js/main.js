document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Data
    DataManager.init();
    
    // 2. Init 3D Visuals
    const visual = new Lottery3D('canvas-container');
    
    // 3. UI Elements
    const els = {
        btnImport: document.getElementById('btn-import'),
        fileInput: document.getElementById('file-input'),
        btnGenerate: document.getElementById('btn-generate'),
        btnAction: document.getElementById('btn-action'), // Start/Stop
        btnReset: document.getElementById('btn-reset'),
        btnWinners: document.getElementById('btn-winners'),
        btnSettings: document.getElementById('btn-settings'),
        prizeList: document.getElementById('prize-list'),
        participantCount: document.getElementById('participant-count'),
        
        // Modals
        winnerModal: document.getElementById('winner-modal'),
        settingsModal: document.getElementById('settings-modal'),
        closeBtns: document.querySelectorAll('.close-modal'),
        
        // Overlay
        overlay: document.getElementById('celebration-overlay'),
        btnCloseOverlay: document.getElementById('btn-close-overlay'),
        
        // Settings Inputs
        newPrizeName: document.getElementById('new-prize-name'),
        newPrizeCount: document.getElementById('new-prize-count'),
        btnAddPrize: document.getElementById('btn-add-prize'),
        bgInput: document.getElementById('bg-input'),

        // Winner Table
        winnerTableBody: document.querySelector('#winner-table tbody'),
        btnExport: document.getElementById('btn-export')
    };

    let isRunning = false;

    // --- Core Logic ---

    function renderUI() {
        // Render Prizes
        els.prizeList.innerHTML = '';
        DataManager.state.prizes.forEach(prize => {
            const winners = DataManager.state.winners.filter(w => w.prizeId === prize.id);
            const isFull = winners.length >= prize.count;
            const isActive = prize.id === DataManager.state.currentPrizeId;
            
            const div = document.createElement('div');
            div.className = `prize-item ${isActive ? 'active' : ''} ${isFull ? 'full' : ''}`;
            div.onclick = () => {
                DataManager.state.currentPrizeId = prize.id;
                DataManager.save();
                renderUI();
            };
            
            div.innerHTML = `
                <div class="prize-name">${prize.name}</div>
                <div class="prize-info">
                    <span>数量: ${prize.count}</span>
                    <span style="color: ${isFull ? '#4ade80' : '#fbbf24'}">${winners.length} / ${prize.count}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(winners.length / prize.count) * 100}%"></div>
                </div>
            `;
            els.prizeList.appendChild(div);
        });

        // Participants Count
        els.participantCount.textContent = `参与人数: ${DataManager.state.participants.length} (剩余: ${DataManager.getRemainingParticipants().length})`;

        // Background
        if (DataManager.state.bgImage) {
            document.getElementById('app').style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${DataManager.state.bgImage})`;
        }

        // 3D Update
        // Only update 3D if not spinning (to avoid glitching reflow)
        if (!isRunning) {
            const remaining = DataManager.getRemainingParticipants();
            const emptyMsg = DataManager.state.participants.length > 0 ? "所有人都中奖了!" : "等待导入数据...";
            visual.updateParticipants(remaining, emptyMsg);
        }
    }

    function toggleLottery() {
        console.log("Toggle Lottery. isRunning:", isRunning);
        if (isRunning) {
            // STOP Logic
            const winners = DataManager.state.winners;
            const prizeId = DataManager.state.currentPrizeId;
            const prize = DataManager.state.prizes.find(p => p.id === prizeId);
            
            if (!prize) {
                console.error("Prize not found!", prizeId);
                isRunning = false;
                visual.setSpinning(false);
                els.btnAction.textContent = "开始";
                els.btnAction.classList.replace('btn-danger', 'btn-primary');
                return;
            }

            // Check limits
            const currentWinnerCount = winners.filter(w => w.prizeId === prizeId).length;
            console.log("Current winners:", currentWinnerCount, "Limit:", prize.count);

            if (currentWinnerCount >= prize.count) {
                showToast("该奖项已抽完！", "error");
                isRunning = false;
                visual.setSpinning(false);
                els.btnAction.textContent = "开始";
                els.btnAction.classList.replace('btn-danger', 'btn-primary');
                return;
            }

            // Pick One
            const eligibles = DataManager.getRemainingParticipants();
            
            if (eligibles.length === 0) {
                showToast("没有符合条件的参与者了！", "error");
                isRunning = false;
                visual.setSpinning(false);
                els.btnAction.textContent = "开始";
                els.btnAction.classList.replace('btn-danger', 'btn-primary');
                return;
            }

            const randIndex = Math.floor(Math.random() * eligibles.length);
            const winner = eligibles[randIndex];

            // Commit
            DataManager.addWinner(winner, prizeId);
            
            // Visual Stop
            visual.setSpinning(false);
            isRunning = false;
            els.btnAction.textContent = "开始";
            els.btnAction.classList.replace('btn-danger', 'btn-primary');

            // Show Overlay
            showCelebration(winner, prize.name);
            renderUI();

        } else {
            // START Logic
            const prizeId = DataManager.state.currentPrizeId;
            const prize = DataManager.state.prizes.find(p => p.id === prizeId);
            
            if (!prize) {
                 showToast("无效的奖项", "error");
                 return;
            }

            const currentWinnerCount = DataManager.state.winners.filter(w => w.prizeId === prizeId).length;

            if (currentWinnerCount >= prize.count) {
                showToast("该奖项已满！请选择其他奖项。", "info");
                return;
            }
            if (DataManager.getRemainingParticipants().length === 0) {
                showToast("没有参与者！请先导入数据。", "error");
                return;
            }

            isRunning = true;
            visual.setSpinning(true);
            els.btnAction.textContent = "停止";
            els.btnAction.classList.replace('btn-primary', 'btn-danger');
        }
    }

    function showCelebration(winner, prizeName) {
        document.getElementById('winner-name').textContent = winner.name;
        document.getElementById('winner-info').textContent = `${winner.phone || ''} | ${winner.department || ''}`;
        document.getElementById('winner-prize').textContent = `获得: ${prizeName}`;
        els.overlay.classList.remove('hidden');
    }

    // --- Event Listeners ---

    // Import
    els.btnImport.onclick = () => els.fileInput.click();
    els.fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            // Map
            const list = json.map((row, i) => ({
                id: row['Phone'] || 'ID-'+Date.now()+'-'+i,
                name: row['Name'] || row['name'] || '未知',
                phone: row['Phone'] || row['phone'] || '',
                department: row['Department'] || row['department'] || ''
            })).filter(p => p.name);

            DataManager.addParticipants(list);
            renderUI();
            showToast(`成功导入 ${list.length} 名参与者。`, "success");
            els.fileInput.value = ''; // reset
        };
        reader.readAsBinaryString(file);
    };

    // Generate
    els.btnGenerate.onclick = () => {
        const names = ["张伟", "王芳", "李娜", "刘强", "陈杰", "杨敏", "赵军", "黄静", "周涛", "吴刚"];
        const depts = ["技术部", "人事部", "销售部", "运营部", "财务部"];
        const list = Array.from({length: 50}, (_, i) => ({
            id: 'auto-'+Date.now()+'-'+i,
            name: names[i % names.length] + " " + (i+1),
            phone: "1380000"+(1000+i),
            department: depts[i % depts.length]
        }));
        DataManager.addParticipants(list);
        renderUI();
    };

    // Start/Stop
    els.btnAction.onclick = toggleLottery;

    // Reset
    // Reset with double confirm
    let resetTimeout;
    els.btnReset.onclick = () => {
        if (els.btnReset.classList.contains('confirm-reset')) {
            // Confirmed
            DataManager.clearData();
            renderUI();
            showToast("数据已全部重置", "success");
            
            // Reset button state
            clearTimeout(resetTimeout);
            els.btnReset.textContent = "全部重置";
            els.btnReset.classList.remove('confirm-reset', 'btn-warning');
            els.btnReset.classList.add('btn-danger');
        } else {
            // First click
            els.btnReset.textContent = "确定重置?";
            els.btnReset.classList.remove('btn-danger');
            els.btnReset.classList.add('btn-warning', 'confirm-reset');
            
            showToast("再次点击以确认重置", "info");

            resetTimeout = setTimeout(() => {
                els.btnReset.textContent = "全部重置";
                els.btnReset.classList.remove('confirm-reset', 'btn-warning');
                els.btnReset.classList.add('btn-danger');
            }, 3000);
        }
    };

    // Modals
    const openModal = (modal) => modal.classList.remove('hidden');
    const closeModal = (modal) => modal.classList.add('hidden');

    els.btnWinners.onclick = () => {
        // Populate table
        const winners = DataManager.getWinners();
        els.winnerTableBody.innerHTML = winners.map(w => {
            const pName = DataManager.state.prizes.find(p => p.id === w.prizeId)?.name || '未知';
            return `
                <tr>
                    <td>${pName}</td>
                    <td>${w.name}</td>
                    <td>${w.phone}</td>
                    <td>${w.department}</td>
                </tr>
            `;
        }).join('');
        openModal(els.winnerModal);
    };

    els.btnSettings.onclick = () => openModal(els.settingsModal);

    els.closeBtns.forEach(btn => btn.onclick = (e) => {
        closeModal(e.target.closest('.modal'));
    });

    els.btnCloseOverlay.onclick = () => els.overlay.classList.add('hidden');

    // Settings logic
    els.btnAddPrize.onclick = () => {
        const name = els.newPrizeName.value;
        const count = parseInt(els.newPrizeCount.value);
        if(name && count > 0) {
            DataManager.addPrize(name, count);
            els.newPrizeName.value = '';
            renderUI();
            showToast("添加奖项成功", "success");
        } else {
            showToast("请输入有效的奖项名称和人数", "error");
        }
    };

    els.bgInput.onchange = (e) => {
        const file = e.target.files[0];
        if(file) {
            const url = URL.createObjectURL(file);
            DataManager.setBackground(url);
            renderUI();
            showToast("背景图片设置成功！", "success");
        }
    };

    els.btnExport.onclick = () => {
        const winners = DataManager.getWinners();
        const data = winners.map(w => ({
            Prize: DataManager.state.prizes.find(p => p.id === w.prizeId)?.name,
            Name: w.name,
            Phone: w.phone,
            Department: w.department
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Winners");
        XLSX.writeFile(wb, "winners.xlsx");
    };

    // Toast Logic
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        
        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // Init Render
    renderUI();

    // Export Toast to global for lottery3d.js to use if needed (optional)
    window.showToast = showToast;
});

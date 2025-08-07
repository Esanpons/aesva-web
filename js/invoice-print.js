// --- Helpers para formateo ---
function fmtNum(n, decimals = 2) {
    return n.toLocaleString(i18n.lang === 'ca' ? 'ca-ES' : 'es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function fmtCurrency(n) {
    return `${fmtNum(n)} €`;
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString(i18n.lang === 'ca' ? 'ca-ES' : 'es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

async function printInvoice(inv) {
    try {
        // Verificar que tenemos acceso a los datos necesarios
        if (typeof imputations === 'undefined') {
            console.error(i18n.t('No se encontraron imputaciones'));
            return;
        }

        // --- Cargar la plantilla HTML ---
        const resp = await fetch('html/invoice-print.html');
        if (!resp.ok) {
            throw new Error(i18n.t('No se pudo cargar html/invoice-print.html'));
        }
        const template = await resp.text();

        // --- Preparar datos ---
        const buyer = customers.find(c => c.no === inv.customerNo) || {};
        const seller = company || {};

        // --- Construir bloques HTML ---
        const sellerHtml = `
            <p><strong> ${seller.name}</strong></p>
            <p><strong>NIF:</strong> ${seller.cif}</p>
            <p><strong>EMAIL:</strong> ${seller.email}</p>
            <p>${seller.address}</p>
        `;
        const buyerHtml = `
            <p><strong> ${buyer.name}</strong></p>
            <p><strong>NIF:</strong> ${buyer.cif}</p>
            <p><strong>EMAIL:</strong> ${buyer.email}</p>
            <p>${buyer.address}</p>
        `;
        const linesHtml = inv.lines.map(l => `
            <tr>
                <td>${l.description}</td>
                <td style="text-align: right;">${fmtNum(l.qty)}</td>
                <td style="text-align: right;">${fmtCurrency(inv.priceHour)}</td>
                <td style="text-align: right;">${fmtCurrency(l.qty * inv.priceHour)}</td>
            </tr>
        `).join('');
        const base = inv.lines.reduce((sum, l) => sum + (l.qty * inv.priceHour), 0);
        const ivaAmount = base * (inv.vat / 100);
        const irpfAmount = base * (inv.irpf / 100);
        const totalAmount = base + ivaAmount - irpfAmount;

        const totalsHtml = `
            <div><span class="total-label">Base</span> <span>${fmtCurrency(base)}</span></div>
            <div><span class="total-label">+ IVA (${inv.vat}%)</span> <span>${fmtCurrency(ivaAmount)}</span></div>
            <div><span class="total-label">- IRPF (${inv.irpf}%)</span> <span>${fmtCurrency(irpfAmount)}</span></div>
            <div class="final-total"><span class="total-label">TOTAL</span> <span>${fmtCurrency(totalAmount)}</span></div>
        `;

        // --- Lógica de imputaciones mejorada ---
        const invoiceDate = new Date(inv.date);
        console.log('Fecha de factura:', {
            fecha: invoiceDate,
            año: invoiceDate.getFullYear(),
            mes: invoiceDate.getMonth() + 1,
            timestamp: invoiceDate.getTime()
        });

        // Filtrar imputaciones
        const imps = imputations.filter(imp => {
            if (!imp || !imp.date) {
                console.log(i18n.t('Imputación inválida:'), imp);
                return false;
            }

            // Normalizar la fecha de la imputación
            const impDate = imp.date instanceof Date ? imp.date : new Date(imp.date);
            const task = tasks.find(t => t.id === imp.taskId);

            // Obtener año y mes normalizados
            const impYear = impDate.getFullYear();
            const impMonth = impDate.getMonth();
            const invYear = invoiceDate.getFullYear();
            const invMonth = invoiceDate.getMonth();

            const matchYear = impYear === invYear;
            const matchMonth = impMonth === invMonth;
            const matchCustomer = task && task.customerNo === inv.customerNo;

            console.log(i18n.t('Evaluando imputación:'), {
                id: imp.id,
                fecha_original: imp.date,
                fecha_normalizada: impDate,
                año: impYear,
                mes: impMonth + 1,
                fecha_factura: invoiceDate,
                año_factura: invYear,
                mes_factura: invMonth + 1,
                coincideAño: matchYear,
                coincideMes: matchMonth,
                coincideCliente: matchCustomer,
                taskId: imp.taskId,
                task: task,
                customerNo: task?.customerNo,
                customerFactura: inv.customerNo
            });

            const matches = matchYear && matchMonth && matchCustomer;
            console.log(`Imputación ${imp.id} ${matches ? 'COINCIDE' : 'NO COINCIDE'}`);

            return matches;
        }).sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
            return dateA - dateB;
        });

        console.log('Imputaciones filtradas:', {
            total: imps.length,
            imputaciones: imps.map(imp => ({
                id: imp.id,
                fecha: imp.date,
                taskId: imp.taskId,
                task: tasks.find(t => t.id === imp.taskId)?.subject
            }))
        });

        // Generar HTML de imputaciones
        let impsSectionHtml = '';
        let pageTotal = 1; // al menos la página de la factura
        if (imps.length > 0) {
            const rowsArray = (inv.arrayLinesInvoicePrint || '').split(',')
                .map(n => parseInt(n.trim(), 10))
                .filter(n => !isNaN(n) && n > 0);
            const ROWS_PER_PAGE_DEFAULT = 25;
            const rowsPerPage = rowsArray.length > 0 ? rowsArray : [ROWS_PER_PAGE_DEFAULT];
            const headerHtml = `
                <header class="main-header">
                    <h1>FACTURA</h1>
                    <div class="invoice-details">
                        <div><span>FECHA:</span> <span>${fmtDate(inv.date)}</span></div>
                        <div><span>NÚMERO:</span> <span>${inv.no}</span></div>
                    </div>
                </header>`;

            const makeRow = rec => {
                const task = tasks.find(t => t.id === rec.taskId) || {};
                const sinCargo = (rec.noFee || task.noCharge) ? i18n.t('Sí') : '';
                const taskLabel = task.clientTaskNo || task.subject || '';
                return `<tr>
                    <td>${fmtDate(rec.date)}</td>
                    <td>${taskLabel}</td>
                    <td>${rec.comments || ''}</td>
                    <td style="text-align: right;">${fmtNum(rec.totalDecimal)}</td>
                    <td style="text-align: center;">${sinCargo}</td>
                </tr>`;
            };

            const pageData = [];
            let idx = 0;
            let page = 0;
            while (idx < imps.length) {
                const rowsThisPage = rowsPerPage[Math.min(page, rowsPerPage.length - 1)];
                const pageRows = imps.slice(idx, idx + rowsThisPage).map(makeRow).join('');
                pageData.push({
                    num: page + 1,
                    html: `
                        <div class="page-break"></div>
                        <div class="imputations-page">
                            ${headerHtml}
                            <table class="imps-table">
                                <thead>
                                    <tr>
                                        <th class="date-col">FECHA</th>
                                        <th class="task-col">TAREA</th>
                                        <th class="desc-col">DESCRIPCIÓN</th>
                                        <th class="qty-col">CANTIDAD</th>
                                        <th class="nocharge-col">SIN CARGO</th>
                                    </tr>
                                </thead>
                                <tbody>${pageRows}</tbody>
                            </table>
                            <div class="imps-footer">Página {{PAGE_NUM}} de {{PAGE_TOTAL}}</div>
                        </div>`
                });
                idx += rowsThisPage;
                page++;
            }

            pageTotal = pageData.length + 1; // +1 por la primera página de la factura
            impsSectionHtml = pageData
                .map(p => p.html
                    .replace('{{PAGE_NUM}}', p.num + 1)
                    .replace('{{PAGE_TOTAL}}', pageTotal))
                .join('');
        }

        // --- Ensamblar el HTML final ---
        const finalHtml = template
            .replace(/{{NO}}/g, inv.no)
            .replace('{{DATE}}', fmtDate(inv.date))
            .replace('{{SELLER}}', sellerHtml)
            .replace('{{BUYER}}', buyerHtml)
            .replace('{{LINES}}', linesHtml)
            .replace('{{TOTALS}}', totalsHtml)
            .replace('{{IBAN}}', seller.iban)
            .replace('{{PAGE_NUM}}', 1)
            .replace('{{PAGE_TOTAL}}', pageTotal)
            .replace('{{IMPS_SECTION}}', impsSectionHtml);

        // --- Lógica de impresión con iframe ---
        let iframe = document.getElementById('printing-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'printing-frame';
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(finalHtml);
        iframeDoc.close();
        if (window.i18n) i18n.apply(iframeDoc);

        iframe.onload = function () {
            setTimeout(function () {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }, 200);
        };

    } catch (error) {
        console.error('Error al generar la factura:', error);
    }
}
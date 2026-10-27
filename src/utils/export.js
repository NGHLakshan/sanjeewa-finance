export const exportToCSV = (transactions, yearMonth = null) => {
  let filtered = transactions;
  
  if (yearMonth && yearMonth !== 'all') {
    const [year, month] = yearMonth.split('-');
    filtered = transactions.filter(t => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      return d.getFullYear() === parseInt(year, 10) && (d.getMonth() + 1) === parseInt(month, 10);
    });
  }

  if (!filtered || filtered.length === 0) {
    return false;
  }

  // Define headers
  const headers = ['Date', 'Time', 'Type', 'Category', 'Amount', 'Payment Method', 'Description'];
  
  // Format rows
  const rows = filtered.map(t => [
    (t.date instanceof Date ? t.date : new Date(t.date)).toLocaleDateString(),
    t.time || '',
    t.type || '',
    `"${(t.category || t.subCategory || 'General').replace(/"/g, '""')}"`,
    t.amount || 0,
    `"${(t.paymentMethod || 'Cash').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"` // Escape quotes for CSV
  ]);

  // Combine into CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sanjeewa_finance_${yearMonth && yearMonth !== 'all' ? yearMonth : 'all'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return true;
};

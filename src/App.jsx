import { useState } from 'react';
import TodayScreen from './screens/Today';
import LoansScreen from './screens/Loans';
import ChitScreen  from './screens/Chit';
import MoreScreen  from './screens/More';
import { ToastHost } from './components/ui';

export default function App() {
  const [tab, setTab]           = useState('today');
  const [focusLoanId, setFocusLoanId] = useState(null);

  function navigate(target) {
    if (target.startsWith('loan:')) {
      setFocusLoanId(target.slice(5));
      setTab('loans');
    } else {
      setTab(target);
    }
  }

  return (
    <div className="shell">
      <div>
        {tab === 'today' && <TodayScreen navigate={navigate} />}
        {tab === 'loans' && (
          <LoansScreen
            focusId={focusLoanId}
            clearFocus={() => setFocusLoanId(null)}
          />
        )}
        {tab === 'chit'  && <ChitScreen />}
        {tab === 'more'  && <MoreScreen />}
      </div>

      <nav className="tabs">
        <TabBtn active={tab === 'today'} onClick={() => setTab('today')} en="Today"   te="ఈ రోజు" icon={<IconSun />} />
        <TabBtn active={tab === 'loans'} onClick={() => setTab('loans')} en="Loans"   te="అప్పులు" icon={<IconCoin />} />
        <TabBtn active={tab === 'chit'}  onClick={() => setTab('chit')}  en="Chit"    te="చిట్టీ"  icon={<IconRing />} />
        <TabBtn active={tab === 'more'}  onClick={() => setTab('more')}  en="More"    te="ఇంకా"   icon={<IconDots />} />
      </nav>

      <ToastHost />
    </div>
  );
}

function TabBtn({ active, onClick, icon, en, te }) {
  return (
    <button className={'tab' + (active ? ' active' : '')} onClick={onClick}>
      {icon}
      <span>{en}</span>
      <span className="te">{te}</span>
    </button>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  );
}
function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h6M9 13h4M9 17h6" />
    </svg>
  );
}
function IconRing() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M9 4h6" />
    </svg>
  );
}
function IconDots() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6"  cy="12" r=".6" fill="currentColor" />
      <circle cx="12" cy="12" r=".6" fill="currentColor" />
      <circle cx="18" cy="12" r=".6" fill="currentColor" />
    </svg>
  );
}

'use client'

import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', gap: 4 }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 py-2.5 font-medium transition-colors relative',
            activeTab === tab.id
              ? 'text-terra'
              : 'text-brown hover:text-ink'
          )}
          style={{ fontSize: 13 }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className="ml-1.5 inline-flex items-center justify-center rounded-full"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 6px',
                backgroundColor: activeTab === tab.id ? '#E0602A' : '#F3F4F6',
                color: activeTab === tab.id ? '#fff' : '#6B7280',
                lineHeight: '16px',
              }}
            >
              {tab.count}
            </span>
          )}
          {activeTab === tab.id && (
            <span
              className="absolute bottom-0 left-0 right-0 bg-terra rounded-full"
              style={{ height: 2 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

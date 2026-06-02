/**
 * Navbar - 导航栏布局组件
 * 使用 Tailwind CSS 重写
 */

'use client'

import type { NavItem } from '../../data/navigation'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useTransClient } from '@/app/i18n/client'
import logo from '@/assets/images/logo.png'
import { cn } from '@/lib/utils'
import { navigateToLogin } from '@/utils/auth'

import { navigation } from '../../data/navigation'

/** 导航项组件 */
function NavItemComponent({ item, t }: { item: NavItem, t: (key: string) => string }) {
  const linkProps = item.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <Link
      href={item.href}
      className="px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
      {...linkProps}
    >
      {t(`navbar.${item.labelKey}`)}
    </Link>
  )
}

/** Logo 组件 */
function Logo() {
  return (
    <Link href="/" className="mr-8 flex items-center gap-2 md:mr-16 group transition-transform duration-200 hover:scale-105">
      <Image
        src={logo}
        alt="AiBrand"
        width={40}
        height={40}
        className="size-8 rounded-md md:size-10 transition-shadow duration-200 group-hover:shadow-(--brand-shadow-sm)"
      />
      <span className="text-lg font-semibold md:text-xl bg-gradient-to-r from-(--brand-purple) to-(--brand-cyan) bg-clip-text text-transparent">AiBrand</span>
    </Link>
  )
}

/** 移动端菜单按钮 */
function MenuButton({ isOpen, onClick }: { isOpen: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-10 flex-col items-center justify-center gap-1.5 md:hidden"
      aria-label="Toggle menu"
    >
      <span
        className={cn(
          'h-0.5 w-5 bg-foreground transition-all duration-300',
          isOpen && 'translate-y-2 rotate-45',
        )}
      />
      <span
        className={cn(
          'h-0.5 w-5 bg-foreground transition-all duration-300',
          isOpen && '-translate-y-0 -rotate-45',
        )}
      />
    </button>
  )
}

export function Navbar() {
  const { t } = useTransClient('welcome')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    if (!mainContent)
      return

    const handleScroll = () => {
      setIsScrolled(mainContent.scrollTop > 10)
    }

    handleScroll()
    mainContent.addEventListener('scroll', handleScroll, { passive: true })
    return () => mainContent.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <nav
        className={cn(
          'px-4 py-3 transition-all duration-300 md:px-6 lg:px-8',
          // 滚动时：背景 + 边框 + 阴影
          isScrolled && 'border-b border-border/50 bg-background/85 backdrop-blur-md shadow-sm',
          isMenuOpen && 'bg-background',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <Logo />

          {/* 桌面端导航菜单 */}
          <div className="hidden flex-1 items-center md:flex">
            <div className="flex items-center gap-1">
              {navigation.map((item, index) => (
                <NavItemComponent key={index} item={item} t={t} />
              ))}
            </div>
          </div>

          {/* 右侧按钮 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToLogin()}
              className="hidden cursor-pointer px-4 py-2 text-sm font-medium text-foreground/80 hover:text-(--brand-purple) md:inline-flex"
            >
              {t('navbar.login')}
            </button>
            <button
              type="button"
              onClick={() => navigateToLogin()}
              className="inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-(--brand-shadow-sm) transition-all duration-200 hover:shadow-(--brand-shadow-md) hover:-translate-y-0.5"
              style={{ background: 'var(--brand-gradient)' }}
            >
              {t('navbar.getDemo')}
            </button>
            <MenuButton isOpen={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)} />
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-2 border-t border-border/50 pt-4 md:hidden">
            {navigation.map((item, index) => (
              <NavItemComponent key={index} item={item} t={t} />
            ))}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false)
                navigateToLogin()
              }}
              className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t('navbar.login')}
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}

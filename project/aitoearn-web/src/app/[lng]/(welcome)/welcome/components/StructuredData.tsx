/**
 * StructuredData — JSON-LD 结构化数据
 * 为搜索引擎提供丰富的页面语义信息
 */

export function StructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aibrand.cn'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'AiBrand',
        url: baseUrl,
        description: 'AI 全域运营平台 — 为超级个体和中小企业提供一站式 AI 内容创作、多平台发布与客户互动管理',
        slogan: '一人顶一个团队',
        logo: `${baseUrl}/logo.png`,
        sameAs: [
          'https://github.com/yikart/AiToEarn',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'support@aibrand.cn',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#software`,
        name: 'AiBrand',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CNY',
          description: '免费开始，Pro 版 ¥299/月，企业版 ¥999/月',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '1280',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'AiBrand',
        inLanguage: ['zh-CN', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

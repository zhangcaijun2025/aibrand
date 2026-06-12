import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsObject, Min, Max } from 'class-validator'

export class GeoScoreDto {
  @ApiProperty({ description: '内容标题' })
  @IsString()
  title!: string

  @ApiProperty({ description: '内容正文' })
  @IsString()
  content!: string

  @ApiProperty({ description: '目标平台' })
  @IsString()
  platform!: string

  @ApiPropertyOptional({ description: '关键词列表' })
  @IsArray()
  @IsOptional()
  keywords?: string[]
}

export class GeoOptimizeDto extends GeoScoreDto {}

export class GeoKeywordsDto {
  @ApiProperty({ description: '搜索主题' })
  @IsString()
  topic!: string

  @ApiPropertyOptional({ description: '行业' })
  @IsString()
  @IsOptional()
  industry?: string

  @ApiPropertyOptional({ description: '目标平台' })
  @IsString()
  @IsOptional()
  platform?: string
}

export class RegionQueryDto {
  @ApiPropertyOptional({ description: '城市名称搜索' })
  @IsString()
  @IsOptional()
  q?: string

  @ApiPropertyOptional({ description: '城市代码' })
  @IsString()
  @IsOptional()
  city?: string

  @ApiPropertyOptional({ description: '平台筛选' })
  @IsString()
  @IsOptional()
  platform?: string
}

export class GeoCanaryDto {
  @ApiProperty({ description: '提案ID' })
  @IsString()
  proposalId!: string

  @ApiProperty({ description: '风险等级' })
  @IsEnum(['low', 'medium', 'high'])
  riskLevel!: 'low' | 'medium' | 'high'

  @ApiProperty({ description: '目标模块' })
  @IsString()
  module!: string

  @ApiProperty({ description: '变更类型' })
  @IsString()
  changeType!: string

  @ApiProperty({ description: '变更描述' })
  @IsString()
  description!: string
}

export class GeoHealthResponseDto {
  @ApiProperty()
  overall!: number

  @ApiProperty()
  dsHealth!: { score: number; aiMentionRate: number; citationPosition: number; authorityWeight: number; intentCoverage: number }

  @ApiProperty()
  localHealth!: { score: number; geoScoreAvg: number; localTrafficRate: number; tagPoiAccuracy: number; complianceRate: number; templateEffect: number }

  @ApiProperty()
  trend!: string
}

import { TemplateName, TemplateProps } from '../types'
import { Classic } from './classic'
import { Split } from './split'
import { Hero } from './hero'

export const templates: Record<TemplateName, (props: TemplateProps) => React.ReactElement> = {
  classic: Classic,
  split: Split,
  hero: Hero,
}

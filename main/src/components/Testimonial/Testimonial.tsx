import s from './Testimonial.module.css'

interface TestimonialProps {
  quote: string
  author: string
  role: string
}

export default function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <section className={s.section}>
      <figure className={s.inner}>
        <blockquote className={s.quote}>{quote}</blockquote>
        <figcaption className={s.caption}>
          <strong className={s.author}>{author}</strong>
          <span className={s.role}>{role}</span>
        </figcaption>
      </figure>
    </section>
  )
}

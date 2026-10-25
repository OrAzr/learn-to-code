import { useState } from 'react'

export function HintList({ hints }) {
  return <div className="hint-stack">
    {hints.map(hint => <div className="help-note hint-tier" key={hint.label}><span><small>{hint.label}</small>{hint.text}</span></div>)}
  </div>
}

export function WhyThisWorks({ coach, onTry }) {
  const [picked, setPicked] = useState(null)
  const choice = coach.why.quiz.choices.find(item => item.id === picked)
  return <section className="why-works" id="why-this-works" aria-labelledby="why-this-works-heading">
    <p className="why-kicker">Unlocked</p>
    <h2 id="why-this-works-heading">Why this works</h2>
    {coach.why.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    <h3>Try this next</h3>
    {coach.why.challenges.map(challenge => <article className="why-challenge" key={challenge.title}>
      <h4>{challenge.title}</h4>
      <p>{challenge.prompt}</p>
      <button type="button" className="why-try" onClick={() => onTry(challenge.sql)}>Try in editor</button>
      <details>
        <summary>What should come back?</summary>
        <p>{challenge.expect}</p>
      </details>
    </article>)}
    <h3>Interview question</h3>
    <fieldset className="why-quiz">
      <legend>{coach.why.quiz.question}</legend>
      {coach.why.quiz.choices.map(item => <button type="button" key={item.id} aria-pressed={picked === item.id} onClick={() => setPicked(item.id)}>{item.text}</button>)}
      {choice && <p className={choice.correct ? 'quiz-yes' : 'quiz-no'}>{choice.correct ? 'Yes.' : 'Not quite.'} {choice.why}</p>}
    </fieldset>
    <h3 id="why-questions">Questions</h3>
    {coach.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
    <h3>Official docs</h3>
    <ul>{coach.reading.map(link => <li key={link.href}><a href={link.href}>{link.title}</a></li>)}</ul>
  </section>
}

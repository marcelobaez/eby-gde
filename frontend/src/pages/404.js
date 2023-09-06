import { Result, Button } from 'antd'
import { useRouter } from 'next/router'

export default function Custom404() {
  const router = useRouter()

  const handleClick = (e) => {
    e.preventDefault()
    router.push('/')
  }

  return (
    <Result
      status="404"
      title="404"
      subTitle="Disculpe, la pagina que busca no existe"
      extra={<Button onClick={handleClick} type="primary">Volver al inicio</Button>}
    />
  )
}

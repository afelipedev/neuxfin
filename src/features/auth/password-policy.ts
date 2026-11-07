/**
 * Regras de senha e tradução dos erros do Supabase Auth.
 * A política espelha a configuração do Supabase (Authentication → Email):
 * mínimo de 8 caracteres, com letras e números.
 */

export const PASSWORD_MIN_LENGTH = 8

/** Mensagem do problema na senha, ou null se ela atende à política. */
export function passwordProblem(password: string): string | null {
    if (password.length < PASSWORD_MIN_LENGTH) return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
    if (!/[a-z]/i.test(password)) return 'A senha precisa ter pelo menos uma letra.'
    if (!/\d/.test(password)) return 'A senha precisa ter pelo menos um número.'
    return null
}

const AUTH_ERRORS: Record<string, string> = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
    user_already_exists: 'Já existe uma conta com este e-mail.',
    email_exists: 'Já existe uma conta com este e-mail.',
    weak_password: 'Senha fraca: use pelo menos 8 caracteres, com letras e números.',
    over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    signup_disabled: 'Cadastro desativado no momento.',
    validation_failed: 'Dados inválidos. Confira o e-mail e a senha.',
}

/**
 * Mensagem amigável para um erro do Supabase Auth. Não repassa a mensagem original
 * (em inglês e às vezes com detalhes internos).
 */
export function authErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
    if (!error) return 'Não foi possível concluir. Tente novamente.'
    if (error.code && AUTH_ERRORS[error.code]) return AUTH_ERRORS[error.code]
    if (/password/i.test(error.message ?? '')) return AUTH_ERRORS.weak_password
    return 'Não foi possível concluir. Tente novamente.'
}

/**
 * Caminho interno seguro para redirecionar depois do login/callback.
 * Recusa URLs absolutas e truques como "//site", "/\\site" ou "@site" (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
    if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback
    if (/[\u0000-\u001f]/.test(next)) return fallback
    return next
}

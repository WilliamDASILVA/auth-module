export default class LocalScheme {
  constructor (auth, options) {
    this.$auth = auth
    this.name = options._name

    this.options = Object.assign({}, DEFAULTS, options)
  }

  _setToken (token) {
    if (this.options.globalToken) {
      // Set Access-Token token for all axios requests
      this.$auth.ctx.app.$axios.setHeader('Access-Token', token)
    }
  }

  _setClient (client) {
    if (this.options.globalToken) {
      // Set Access-Token token for all axios requests
      this.$auth.ctx.app.$axios.setHeader('Client', client)
    }
  }

  _setUid (uid) {
    if (this.options.globalToken) {
      // Set Access-Token token for all axios requests
      this.$auth.ctx.app.$axios.setHeader('Uid', uid)
    }
  }

  _clearToken () {
    if (this.options.globalToken) {
      // Clear Access-Token token for all axios requests
      this.$auth.ctx.app.$axios.setHeader('Access-Token', false)
      this.$auth.ctx.app.$axios.setHeader('Client', false)
      this.$auth.ctx.app.$axios.setHeader('Uid', false)
    }
  }

  mounted () {
    if (this.options.tokenRequired) {
      const token = this.$auth.syncToken(this.name)
      this._setToken(token)
    }

    return this.$auth.fetchUserOnce()
  }

  async login (endpoint) {
    if (!this.options.endpoints.login) {
      return
    }

    // Ditch any leftover local tokens before attempting to log in
    await this._logoutLocally()

    console.log('endpoint', endpoint, this.options.endpoints.login)
    delete this.options.endpoints.login.propertyName
    const res = await this.$auth.request(
      endpoint,
      this.options.endpoints.login
    )

    console.log('request result here', res)
    if (this.options.tokenRequired) {
      const token = res.headers['access-token']
      const client = res.headers['client']
      const uid = res.headers['uid']

      this.$auth.setToken(this.name, token)
      this.$auth.setClient(this.name, client)
      this.$auth.setUid(this.name, uid)
      this._setToken(token)
      this._setClient(client)
      this._setUid(uid)
    }

    return this.fetchUser()
  }

  async setUserToken (tokenValue) {
    // Ditch any leftover local tokens before attempting to log in
    await this._logoutLocally()

    if (this.options.tokenRequired) {
      const token = this.options.tokenType
        ? this.options.tokenType + ' ' + tokenValue
        : tokenValue

      this.$auth.setToken(this.name, token)
      this._setToken(token)
    }

    return this.fetchUser()
  }

  async fetchUser (endpoint) {
    // User endpoint is disabled.
    if (!this.options.endpoints.user) {
      this.$auth.setUser({})
      return
    }

    // Token is required but not available
    if (this.options.tokenRequired && !this.$auth.getToken(this.name)) {
      return
    }

    // Try to fetch user and then set
    console.log('user', this.name, endpoint)
    const user = await this.$auth.requestWith(
      this.name,
      endpoint,
      this.options.endpoints.user
    )
    this.$auth.setUser(user.data)
  }

  async logout (endpoint) {
    // Only connect to logout endpoint if it's configured
    if (this.options.endpoints.logout) {
      await this.$auth
        .requestWith(this.name, endpoint, this.options.endpoints.logout)
        .catch(() => { })
    }

    // But logout locally regardless
    return this._logoutLocally()
  }

  async _logoutLocally () {
    if (this.options.tokenRequired) {
      this._clearToken()
    }

    return this.$auth.reset()
  }
}

const DEFAULTS = {
  tokenRequired: true,
  tokenType: 'Bearer',
  globalToken: true,
  tokenName: 'Access-Token'
}

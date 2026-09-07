// routes/login.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await User.findOne({ where: { email } });

  if (!usuario || usuario.password !== password) {
    return res.status(401).json({ mensaje: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, usuario });
});

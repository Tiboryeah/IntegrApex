const express = require('express');

const router = express.Router();

router.use(require('./auth.routes'));
router.use(require('./contratos.routes'));
router.use(require('./fianzas.routes'));
router.use(require('./convenios.routes'));
router.use(require('./bitacora.routes'));
router.use(require('./minutasVisitas.routes'));
router.use(require('./trabajosPeriodo.routes'));
router.use(require('./estimaciones.routes'));
router.use(require('./tableros.routes'));
router.use(require('./reportes.routes'));
router.use(require('./pagos.routes'));
router.use(require('./alertas.routes'));
router.use(require('./notificaciones.routes'));

module.exports = router;

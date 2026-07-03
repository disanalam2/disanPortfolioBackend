const verifyToken = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

// Route 1: Saare Certificates GET karna
router.get('/', certificateController.getCertificates);

// Route 2: Naya Certificate ADD karna
router.post('/add', verifyToken, certificateController.validateCertificate, certificateController.addCertificate);

// Route 3: Certificate UPDATE karna
router.put('/update/:id', verifyToken, certificateController.validateCertificate, certificateController.updateCertificate);

// Route 4: Certificate DELETE karna
router.delete('/delete/:id', verifyToken, certificateController.deleteCertificate);

module.exports = router;
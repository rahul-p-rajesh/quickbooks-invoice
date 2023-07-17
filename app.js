const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const OAuthClient = require('intuit-oauth');

const app = express();

// CORS Configuration
app.use(cors());
app.use(express.json());

//quckbooks
const qbo = new OAuthClient({
    clientId: 'AB8J0iGydjEOIrD7qzrkrA3VUu1l1siejNNqwOlJMpfJorFv2o',
    clientSecret: '0YKmbmvaTLPSclI3k9YEpKtVyDZCSzhBYWCRQUfp',
    environment: 'sandbox', // Change to 'production' for the live environment
    redirectUri: 'http://localhost:3000/callback',
});

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Express API with Swagger',
            version: '1.0.0',
            description: 'API documentation using Swagger',
        },
    },
    apis: ['./app.js'], // Specify the path to your API route files
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Example route
/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Returns a greeting message
 *     responses:
 *       200:
 *         description: A successful response with a greeting message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello, world!
 */
app.get('/hello', (req, res) => {
    res.json({ message: 'Hello, world!' });
});

// 
/**
 * @swagger
 * /authorize:
 *   get:
 *     summary: Authorization route
 *     responses:
 *       200:
 *         description: authUri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello, world!
 */
app.get('/authorize', (req, res) => {
    const authUri = qbo.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    });
    res.redirect(authUri);
});

// Callback route
app.get('/callback', (req, res) => {
    const authCode = req.query.code;

    qbo.createToken(authCode, (error, authResponse) => {
        if (error) {
            console.error('Token exchange error:', error);
            res.status(500).send('Token exchange failed');
        } else {
            const accessToken = authResponse.access_token;
            const refreshToken = authResponse.refresh_token;
            const realmId = authResponse.realmId;

            const qboWithToken = new OAuthClient({
                clientId: process.env.OAuthClient_CLIENT_ID,
                clientSecret: process.env.OAuthClient_CLIENT_SECRET,
                environment: 'sandbox', // Change to 'production' for live environment
                redirectUri: 'http://localhost:3000/callback',
                accessToken,
                refreshToken,
                realmId,
            });

            // Save the tokens and realmId for future use

            // Continue with customer creation and invoice generation
            // See the next steps
        }
    });
});

// Create a customer
app.post('/create-customer', (req, res) => {
    const { name, email } = req.body;

    const customerData = {
        DisplayName: name,
        PrimaryEmailAddr: { Address: email },
    };

    qboWithToken.createCustomer(customerData, (error, customer) => {
        if (error) {
            console.error('Customer creation error:', error);
            res.status(500).send('Customer creation failed');
        } else {
            const customerId = customer.Id;
            // Continue with invoice generation
            // See the next step
        }
    });
});

// Create an invoice
app.post('/create-invoice', (req, res) => {
    const { customerId, amount } = req.body;

    const invoiceData = {
        Line: [
            {
                DetailType: 'SalesItemLineDetail',
                SalesItemLineDetail: {
                    ItemRef: { value: 'PRODUCT_ID' },
                    Qty: 1,
                    UnitPrice: amount,
                },
            },
        ],
        CustomerRef: { value: customerId },
    };

    qboWithToken.createInvoice(invoiceData, (error, invoice) => {
        if (error) {
            console.error('Invoice creation error:', error);
            res.status(500).send('Invoice creation failed');
        } else {
            res.json(invoice);
        }
    });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

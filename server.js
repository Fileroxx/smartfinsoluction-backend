const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Coloque sua senha aqui, se houver
  database: "signup",
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados: " + err.stack);
    return;
  }
  console.log("Conexão bem-sucedida ao banco de dados");
});

app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;
  const sql = "INSERT INTO login (name, email, password) VALUES (?, ?, ?)";
  const values = [name, email, password];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.json("Error");
    }

    if (result.affectedRows > 0) {
      return res.json("Success");
    } else {
      return res.json("Failed");
    }
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM login WHERE email = ? AND password = ?";
  const values = [email, password];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    if (result.length === 0) {
      return res.status(401).json("Credenciais inválidas");
    }

    const user = result[0];
    const token = jwt.sign({name: user.name, userId: user.id, email: user.email }, "chave-secreta", {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true });
    return res.json({ token });
  });
});

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json("Token não fornecido");
  }

  jwt.verify(token, "chave-secreta", (err, user) => {
    if (err) {
      return res.status(403).json("Token inválido");
    }

    req.user = user;
    next();
  });
};

app.get("/users", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM login";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    return res.json(result);
  });
});

app.get("/users/all", (req, res) => {
  const sql = "SELECT * FROM login";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao executar a consulta: " + err.stack);
      return res.status(500).json("Error");
    }

    return res.json(result);
  });
});


app.get("/user/:token", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    // Verificar se o token é válido e não expirado, se necessário

    // Recuperar as informações do usuário do payload do token
    const userId = decodedToken.userId;
    const name = decodedToken.name;
    const email = decodedToken.email;

    // Use as informações do usuário para fazer a consulta no banco de dados ou realizar outras ações necessárias

    const user = {
      userId,
      name,
      email
    };

    return res.json(user);
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.post("/user/:token/ativo", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;
    const { nomeAtivo, quantidadeAtivos, valorAtivo } = req.body;

    const sql = "INSERT INTO stocks.ativos (nomeAtivo, quantidadeAtivos, valorAtivo, userId) VALUES (?, ?, ?, ?)";
    const values = [nomeAtivo, quantidadeAtivos, valorAtivo, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Error");
      }

      if (result.affectedRows > 0) {
        return res.json("Success");
      } else {
        return res.json("Failed");
      }
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});


app.get("/user/:token/ativo", (req, res) => {
  const token = req.params.token;

  try {
    const decodedToken = jwt.verify(token, "chave-secreta");

    const userId = decodedToken.userId;

    const sql = "SELECT * FROM stocks.ativos WHERE userId = ?";
    const values = [userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao executar a consulta: " + err.stack);
        return res.status(500).json("Error");
      }

      // Mapear os resultados do banco de dados para um formato desejado (opcional)
      const ativos = result.map((row) => ({
        id: row.id,
        nome: row.nomeAtivo,
        quantidade: row.quantidadeAtivos,
        valor: row.valorAtivo,
      }));

      return res.json(ativos);
    });
  } catch (error) {
    console.error("Erro ao verificar o token: " + error);
    return res.status(401).json("Token inválido");
  }
});

const port = 8081;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

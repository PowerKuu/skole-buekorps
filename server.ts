// Init  express

import { createHash } from "crypto"
import express from "express"
import cookieParser from "cookie-parser"
import { join } from "path"

import { PrismaClient } from "@prisma/client"


const prisma = new PrismaClient()
const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))

function getFilePath(path: string): string {
    return join(__dirname, "pages", path)
}

function sha256(input: string): string {
    const hash = createHash("sha256")
    hash.update(input)
    return hash.digest("hex")
}

app.get("/", (req, res) => {
    const token = req.cookies.token
    if (!token) return res.redirect("/auth")

    res.sendFile(getFilePath("home.html"))
})

app.get("/auth", (req, res) => {
    const token = req.cookies.token
    if (token) return res.redirect("/")

    res.sendFile(getFilePath("auth.html"))
})


app.post("/api/register", async (req, res) => {
    const { email, password } = req.body

    const passwordHash = sha256(password)

    const user = await prisma.user.create({
        data: {
            email,
            password: passwordHash
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!user) return res.sendStatus(400)

    res.cookie("token", user.token)
    res.send(user)
})

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body

    const passwordHash = sha256(password)

    const user = await prisma.user.findUnique({
        where: {
            email,
            password: passwordHash
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!user) return res.sendStatus(404)

    res.cookie("token", user.token)
    res.send(user)
})

app.post("/api/note", async (req, res) => {
    const token = req.cookies.token

    const user = await prisma.user.findUnique({
        where: {
            token
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!user) return res.sendStatus(401)

    const { title, content } = req.body

    const note = await prisma.note.create({
        data: {
            title,
            content,

            author: {
                connect: {
                    id: user.id
                }
            }
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!note) return res.sendStatus(400)
    res.send(note)
})

app.get("/api/note", async (req, res) => {
    const { token } = req.body


    const user = await prisma.user.findUnique({
        where: {
            token
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!user) return res.sendStatus(401)

    const notes = await prisma.note.findMany({
        where: {
            authorId: user.id
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!notes) return res.sendStatus(400)

    res.send(notes)
})

app.listen(8080, () => {
    console.log('Server is running on port 3000')
})

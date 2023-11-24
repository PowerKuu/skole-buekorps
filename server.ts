// Init  express

import { createHash } from "crypto"
import express from "express"
import cookieParser from "cookie-parser"
import { join } from "path"

import { PrismaClient, Role, User } from "@prisma/client"


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

app.post("/api/user/register", async (req, res) => {
    const { email, password } = req.body

    const passwordHash = sha256(password)

    const user = await prisma.user.create({
        data: {
            email,
            password: passwordHash,
        }
    }).catch((err) => {
        res.send(err)
    })

    if (!user) return res.sendStatus(400)

    res.cookie("token", user.token)
    res.send(user)
})

app.post("/api/user/remove", async (req, res) => {
    const { token, executingToken }: { token: string, executingToken: string} = req.body

    if (token === executingToken) {
        const user = await prisma.user.delete({
            where: {
                token: token
            }
        }).catch((err) => {
            res.send(err)
        })

        if (!user) return res.sendStatus(401)
    } else {
        const adminUser = await prisma.user.findUnique({
            where: {
                token: executingToken,
                role: Role.ADMIN,

                OR: [
                    {
                        token: token,
                        role: Role.MANAGER
                    }
                ]
            }
        }).catch((err) => {
            res.send(err)
        })

        if (!adminUser) return res.sendStatus(401)

        const user = await prisma.user.delete({
            where: {
                token: token
            }
        }).catch((err) => {
            res.send(err)
        })

        if (!user) return res.sendStatus(404)
    }

    res.sendStatus(200)
})

app.post("/api/user/edit", async (req, res) => {
    const { token, executingToken, user: newUser }: { token: string, executingToken: string, user: Partial<User>} = req.body

    if (token === executingToken) {
        const user = await prisma.user.update({
            where: {
                token: token
            },
            
            data: newUser
        }).catch((err) => {
            res.send(err)
        })

        if (!user) return res.sendStatus(401)
    } else {
        const adminUser = await prisma.user.findUnique({
            where: {
                token: executingToken,
                role: Role.ADMIN,

                OR: [
                    {
                        token: token,
                        role: Role.MANAGER
                    }
                ]
            }
        }).catch((err) => {
            res.send(err)
        })

        if (!adminUser) return res.sendStatus(401)

        const user = await prisma.user.update({
            where: {
                token: token
            },

            data: newUser
        }).catch((err) => {
            res.send(err)
        })

        if (!user) return res.sendStatus(404)
    }

    res.sendStatus(200)
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

app.listen(8080, () => {
    console.log('Server is running on port 3000')
})

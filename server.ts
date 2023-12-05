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

})

app.post("/api/user/edit", async (req, res) => {
    const { companyID, userID, executingToken, user: newUser }: { companyID: number, userID?: number, executingToken: string, user: Partial<User>} = req.body

    const selfEdit = userID === undefined

    

    res.sendStatus(200)
})

app.post("/api/company/get", async (req, res) => {
    const { executingToken, companyID }: { executingToken: string, companyID: number } = req.body

    const userOnCompany = await prisma.user.findUnique({
        where: {
            token: executingToken,
            peloton: {
                companyId: companyID
            }
        }
    }).catch((err) => {
        res.send(err)
    })

    

    if (!userOnCompany) return res.sendStatus(401)

    const company = await prisma.company.findFirst({
        where: {
            id: companyID
        },

        include: {
            pelotons: {
                include: {
                    users: {
                        select: {
                            email: true
                        }
                    }
                }
            }
        }
    })

    
    res.send(company)
})

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body

    const passwordHash = sha256(password)

    console.log(email, passwordHash)

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
    console.log('Server is running')
})